import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { resolveEffectivePrice, type EffectivePriceResult, type PromotionRule } from "./effective-price.util";

export interface ActivePromotions {
  byCategory: Map<string, PromotionRule[]>;
  byBrand: Map<string, PromotionRule[]>;
  store: PromotionRule[];
}

interface PriceableProduct {
  price: unknown;
  promoPrice: unknown;
  categoryId: string;
  brandId: string | null;
}

/** Point d'entrée unique pour toute résolution de prix produit — catalogue,
 * recherche, fiche produit, panier, checkout, commandes et landing pages
 * appellent tous ce même service plutôt que de dupliquer le fallback
 * `promoPrice ?? price` (qui ignorait jusqu'ici complètement les promotions
 * catégorie/marque, les rendant purement décoratives dans le Back-Office). */
@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  /** À appeler une seule fois par requête (pas par produit) — la table
   * Promotion est petite et les promotions actives ne changent pas en cours
   * de traitement d'une même requête. */
  async getActivePromotions(): Promise<ActivePromotions> {
    const now = new Date();
    const active = await this.prisma.promotion.findMany({
      where: { status: "ACTIVE", startAt: { lte: now }, endAt: { gte: now } },
    });

    const byCategory = new Map<string, PromotionRule[]>();
    const byBrand = new Map<string, PromotionRule[]>();
    const store: PromotionRule[] = [];

    for (const promotion of active) {
      const rule: PromotionRule = { type: promotion.type, value: Number(promotion.value) };
      if (promotion.scope === "CATEGORY" && promotion.categoryId) {
        byCategory.set(promotion.categoryId, [...(byCategory.get(promotion.categoryId) ?? []), rule]);
      } else if (promotion.scope === "BRAND" && promotion.brandId) {
        byBrand.set(promotion.brandId, [...(byBrand.get(promotion.brandId) ?? []), rule]);
      } else if (promotion.scope === "STORE") {
        store.push(rule);
      }
    }

    return { byCategory, byBrand, store };
  }

  /** Résout le prix effectif d'un produit (hors variante — une variante a son
   * propre prix, qui prime toujours sur promoPrice/promotions, cf.
   * cart.service.ts / orders.service.ts). */
  resolveForProduct(product: PriceableProduct, active: ActivePromotions): EffectivePriceResult {
    return resolveEffectivePrice({
      basePrice: Number(product.price),
      promoPrice: product.promoPrice != null ? Number(product.promoPrice) : null,
      categoryPromotions: active.byCategory.get(product.categoryId) ?? [],
      brandPromotions: product.brandId ? (active.byBrand.get(product.brandId) ?? []) : [],
      storePromotions: active.store,
    });
  }
}
