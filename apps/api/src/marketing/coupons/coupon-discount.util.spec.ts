import { calculateCouponDiscount } from "./coupon-discount.util";

describe("calculateCouponDiscount", () => {
  it("returns 0 when there is no coupon", () => {
    expect(calculateCouponDiscount(500, null)).toBe(0);
  });

  it("computes a percentage discount, rounded to the nearest DH", () => {
    expect(calculateCouponDiscount(499, { type: "PERCENTAGE", value: 10 })).toBe(50); // 49.9 -> 50
    expect(calculateCouponDiscount(100, { type: "PERCENTAGE", value: 15 })).toBe(15);
    expect(calculateCouponDiscount(0, { type: "PERCENTAGE", value: 50 })).toBe(0);
  });

  it("caps a fixed-amount discount at the subtotal (never a negative total)", () => {
    expect(calculateCouponDiscount(500, { type: "FIXED_AMOUNT", value: 100 })).toBe(100);
    expect(calculateCouponDiscount(50, { type: "FIXED_AMOUNT", value: 100 })).toBe(50);
  });

  it("never discounts the subtotal for FREE_SHIPPING — that waives the shipping fee instead, at checkout", () => {
    expect(calculateCouponDiscount(500, { type: "FREE_SHIPPING", value: 0 })).toBe(0);
  });

  it("accepts a Prisma Decimal-like value (anything Number() can coerce)", () => {
    const decimalLike = { toString: () => "25" } as unknown as number;
    expect(calculateCouponDiscount(200, { type: "PERCENTAGE", value: decimalLike })).toBe(50);
  });
});
