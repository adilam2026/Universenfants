import { calculateLoyaltyRedemption, calculateVat } from "./order-pricing.util";

describe("calculateVat", () => {
  it("extracts VAT from a VAT-inclusive total", () => {
    // 120 TTC at 20% -> 100 HT -> 20 DH de TVA
    expect(calculateVat(120, 0.2)).toBe(20);
  });

  it("returns 0 when the rate is 0", () => {
    expect(calculateVat(250, 0)).toBe(0);
  });

  it("rounds to the nearest DH", () => {
    expect(calculateVat(99, 0.2)).toBe(17); // 16.5 -> rounds to 17 (Math.round half-up)
  });
});

describe("calculateLoyaltyRedemption", () => {
  it("converts points to a discount at the configured rate", () => {
    // 500 points at a rate of 10 points/DH -> 50 DH, well under the subtotal
    expect(calculateLoyaltyRedemption(1000, 0, 500, 10)).toEqual({
      loyaltyDiscount: 50,
      pointsToRedeem: 500,
    });
  });

  it("never discounts more than what's left to pay after the coupon", () => {
    // Customer has enough points for 200 DH, but only 80 DH remains after a
    // 120 DH coupon on a 200 DH subtotal — redemption is capped, and only
    // the points actually needed are spent, not the full affordable amount.
    const result = calculateLoyaltyRedemption(200, 120, 2000, 10);
    expect(result.loyaltyDiscount).toBe(80);
    expect(result.pointsToRedeem).toBe(800);
  });

  it("never discounts more than the customer's points balance affords", () => {
    // Only 35 points available at a rate of 10/DH -> floor(35/10) = 3 DH,
    // even though the subtotal could absorb much more.
    const result = calculateLoyaltyRedemption(1000, 0, 35, 10);
    expect(result.loyaltyDiscount).toBe(3);
    expect(result.pointsToRedeem).toBe(30);
  });

  it("returns zero when the coupon already covers the full subtotal", () => {
    expect(calculateLoyaltyRedemption(100, 100, 5000, 10)).toEqual({
      loyaltyDiscount: 0,
      pointsToRedeem: 0,
    });
  });

  it("returns zero with no points balance", () => {
    expect(calculateLoyaltyRedemption(500, 0, 0, 10)).toEqual({
      loyaltyDiscount: 0,
      pointsToRedeem: 0,
    });
  });
});
