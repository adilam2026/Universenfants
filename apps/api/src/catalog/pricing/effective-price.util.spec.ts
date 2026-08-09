import { resolveEffectivePrice } from "./effective-price.util";

describe("resolveEffectivePrice", () => {
  it("returns the base price when nothing applies", () => {
    const result = resolveEffectivePrice({ basePrice: 200 });
    expect(result).toEqual({ price: 200, compareAtPrice: null, source: "BASE" });
  });

  it("uses the client's exact example: promoPrice wins over category and brand promotions", () => {
    // Produit 200 DH, promoPrice 150, promotion catégorie -> 160, promotion marque -> 170.
    const result = resolveEffectivePrice({
      basePrice: 200,
      promoPrice: 150,
      categoryPromotions: [{ type: "FIXED_AMOUNT", value: 40 }], // 200 - 40 = 160
      brandPromotions: [{ type: "FIXED_AMOUNT", value: 30 }], // 200 - 30 = 170
    });
    expect(result.price).toBe(150);
    expect(result.compareAtPrice).toBe(200);
    expect(result.source).toBe("PRODUCT_PROMO");
  });

  it("picks the category promotion when it beats both promoPrice and the brand promotion", () => {
    const result = resolveEffectivePrice({
      basePrice: 200,
      promoPrice: 190,
      categoryPromotions: [{ type: "PERCENTAGE", value: 30 }], // 200 - 30% = 140
      brandPromotions: [{ type: "FIXED_AMOUNT", value: 20 }], // 180
    });
    expect(result.price).toBe(140);
    expect(result.source).toBe("CATEGORY_PROMOTION");
  });

  it("picks the brand promotion when it is the only one active and beats the base price", () => {
    const result = resolveEffectivePrice({
      basePrice: 200,
      brandPromotions: [{ type: "PERCENTAGE", value: 10 }], // 180
    });
    expect(result.price).toBe(180);
    expect(result.compareAtPrice).toBe(200);
    expect(result.source).toBe("BRAND_PROMOTION");
  });

  it("never cumulates a category and a brand promotion even when both apply", () => {
    const result = resolveEffectivePrice({
      basePrice: 200,
      categoryPromotions: [{ type: "PERCENTAGE", value: 10 }], // 180
      brandPromotions: [{ type: "PERCENTAGE", value: 15 }], // 170
    });
    // Si les deux se cumulaient, le prix serait 200 * 0.9 * 0.85 = 153.
    expect(result.price).toBe(170);
  });

  it("falls back to the store-wide promotion when it is the most advantageous", () => {
    const result = resolveEffectivePrice({
      basePrice: 200,
      promoPrice: 195,
      categoryPromotions: [{ type: "FIXED_AMOUNT", value: 5 }], // 195
      storePromotions: [{ type: "PERCENTAGE", value: 50 }], // 100
    });
    expect(result.price).toBe(100);
    expect(result.source).toBe("STORE_PROMOTION");
  });

  it("takes the best of several overlapping promotions in the same tier", () => {
    const result = resolveEffectivePrice({
      basePrice: 200,
      categoryPromotions: [
        { type: "FIXED_AMOUNT", value: 10 }, // 190
        { type: "PERCENTAGE", value: 25 }, // 150
      ],
    });
    expect(result.price).toBe(150);
  });

  it("ignores a promoPrice or promotion that would raise the price above the base price", () => {
    const result = resolveEffectivePrice({
      basePrice: 200,
      promoPrice: 250, // mal configuré, jamais retenu
      brandPromotions: [{ type: "FIXED_AMOUNT", value: -20 }], // 220, jamais retenu
    });
    expect(result.price).toBe(200);
    expect(result.compareAtPrice).toBeNull();
    expect(result.source).toBe("BASE");
  });

  it("never returns a negative price", () => {
    const result = resolveEffectivePrice({
      basePrice: 50,
      brandPromotions: [{ type: "FIXED_AMOUNT", value: 1000 }],
    });
    expect(result.price).toBe(0);
  });

  it("rounds percentage-derived prices to the nearest whole currency unit", () => {
    const result = resolveEffectivePrice({
      basePrice: 99,
      categoryPromotions: [{ type: "PERCENTAGE", value: 33 }], // 99 * 0.67 = 66.33
    });
    expect(result.price).toBe(66);
  });
});
