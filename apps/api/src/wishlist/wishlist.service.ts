import { Injectable, NotFoundException } from "@nestjs/common";
import { nanoid } from "nanoid";
import { PrismaService } from "../prisma/prisma.service";
import { PricingService } from "../catalog/pricing/pricing.service";

@Injectable()
export class WishlistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
  ) {}

  private async getOrCreate(customerId: string) {
    return this.prisma.wishlist.upsert({
      where: { customerId },
      update: {},
      create: { customerId },
    });
  }

  async list(customerId: string) {
    const wishlist = await this.getOrCreate(customerId);
    const lines = await this.prisma.wishlistLine.findMany({
      where: { wishlistId: wishlist.id, removedAt: null },
      include: { product: { include: { images: { take: 1 } } } },
      orderBy: { addedAt: "desc" },
    });
    // Le prix affiché doit passer par le moteur de prix centralisé (comme
    // partout ailleurs) — se fier au seul product.promoPrice ignorait les
    // promotions catégorie/marque/boutique actives.
    const active = await this.pricing.getActivePromotions();
    return lines.map((l) => ({
      productId: l.productId,
      addedAt: l.addedAt,
      name: l.product.nameFr,
      nameAr: l.product.nameAr,
      price: this.pricing.resolveForProduct(l.product, active).price,
      image: l.product.images[0]?.url ?? null,
      available: l.product.stock - l.product.reservedStock > 0,
    }));
  }

  async add(customerId: string, productId: string) {
    const wishlist = await this.getOrCreate(customerId);
    // upsert plutôt que findFirst()+create()/update() : deux ajouts
    // concurrents pour le même produit (double-clic sur le cœur, retry
    // réseau) passaient auparavant tous les deux le findFirst() avant
    // qu'aucun n'ait committé, créant chacun leur propre ligne — le produit
    // apparaissait alors deux fois dans la wishlist. upsert s'appuie sur la
    // contrainte unique (wishlistId, productId) pour rester atomique.
    await this.prisma.wishlistLine.upsert({
      where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
      update: { removedAt: null },
      create: { wishlistId: wishlist.id, productId },
    });
    return this.list(customerId);
  }

  async remove(customerId: string, productId: string) {
    const wishlist = await this.getOrCreate(customerId);
    // Conservé (removedAt) plutôt que supprimé, pour l'analytics wishlist (§210).
    await this.prisma.wishlistLine.updateMany({
      where: { wishlistId: wishlist.id, productId, removedAt: null },
      data: { removedAt: new Date() },
    });
    return this.list(customerId);
  }

  /** Génère le lien de partage à la demande (comme Cart.shareToken) plutôt
   * qu'à la création — la wishlist existe déjà pour chaque client depuis
   * son inscription. */
  async getShareToken(customerId: string): Promise<string> {
    const wishlist = await this.getOrCreate(customerId);
    if (wishlist.shareToken) return wishlist.shareToken;
    const shareToken = nanoid(12);
    await this.prisma.wishlist.update({ where: { id: wishlist.id }, data: { shareToken } });
    return shareToken;
  }

  /** Fiche publique en lecture seule — jamais l'identité du client, comme
   * BirthdayList.getShared(). */
  async getShared(shareToken: string) {
    const wishlist = await this.prisma.wishlist.findUnique({ where: { shareToken } });
    if (!wishlist) throw new NotFoundException("Liste introuvable");
    const lines = await this.prisma.wishlistLine.findMany({
      where: { wishlistId: wishlist.id, removedAt: null },
      include: { product: { include: { images: { take: 1 } } } },
      orderBy: { addedAt: "desc" },
    });
    const active = await this.pricing.getActivePromotions();
    return lines.map((l) => ({
      productId: l.productId,
      name: l.product.nameFr,
      nameAr: l.product.nameAr,
      seoUrl: l.product.seoUrl,
      price: this.pricing.resolveForProduct(l.product, active).price,
      image: l.product.images[0]?.url ?? null,
      available: l.product.stock - l.product.reservedStock > 0,
    }));
  }
}
