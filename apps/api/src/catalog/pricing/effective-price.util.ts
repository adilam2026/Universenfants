export type PromotionRuleType = "PERCENTAGE" | "FIXED_AMOUNT";

export interface PromotionRule {
  type: PromotionRuleType;
  value: number;
}

export type EffectivePriceSource = "BASE" | "PRODUCT_PROMO" | "CATEGORY_PROMOTION" | "BRAND_PROMOTION" | "STORE_PROMOTION";

export interface EffectivePriceInput {
  basePrice: number;
  promoPrice?: number | null;
  categoryPromotions?: PromotionRule[];
  brandPromotions?: PromotionRule[];
  storePromotions?: PromotionRule[];
}

export interface EffectivePriceResult {
  /** Prix final à facturer/afficher. */
  price: number;
  /** Prix catalogue à afficher barré, ou null si aucune remise ne s'applique. */
  compareAtPrice: number | null;
  source: EffectivePriceSource;
}

function applyRule(basePrice: number, rule: PromotionRule): number {
  const raw = rule.type === "PERCENTAGE" ? basePrice - (basePrice * rule.value) / 100 : basePrice - rule.value;
  return Math.max(0, Math.round(raw));
}

/**
 * Moteur de prix centralisé — une seule implémentation utilisée partout
 * (catalogue, recherche, fiche produit, panier, checkout, commandes, landing
 * pages) pour qu'un même produit ne puisse jamais afficher un prix à un
 * endroit et en facturer un autre à un autre.
 *
 * Règle métier (validée) : promoPrice produit, promotion catégorie et
 * promotion marque ne se cumulent JAMAIS entre elles — parmi les sources
 * actives, seule la plus avantageuse pour le client est retenue. Une
 * promotion "boutique" (scope STORE) est traitée comme une source
 * supplémentaire au même titre, la moins prioritaire par défaut mais toujours
 * soumise à la même règle du prix le plus avantageux.
 */
export function resolveEffectivePrice(input: EffectivePriceInput): EffectivePriceResult {
  const basePrice = Math.round(input.basePrice);
  const candidates: { price: number; source: EffectivePriceSource }[] = [{ price: basePrice, source: "BASE" }];

  if (input.promoPrice != null) {
    candidates.push({ price: Math.round(input.promoPrice), source: "PRODUCT_PROMO" });
  }
  for (const rule of input.categoryPromotions ?? []) {
    candidates.push({ price: applyRule(basePrice, rule), source: "CATEGORY_PROMOTION" });
  }
  for (const rule of input.brandPromotions ?? []) {
    candidates.push({ price: applyRule(basePrice, rule), source: "BRAND_PROMOTION" });
  }
  for (const rule of input.storePromotions ?? []) {
    candidates.push({ price: applyRule(basePrice, rule), source: "STORE_PROMOTION" });
  }

  let best = candidates[0];
  for (const candidate of candidates) {
    if (candidate.price < best.price) best = candidate;
  }

  return {
    price: best.price,
    compareAtPrice: best.price < basePrice ? basePrice : null,
    source: best.source,
  };
}
