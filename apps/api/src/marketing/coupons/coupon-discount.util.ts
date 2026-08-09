import type { Prisma } from "@prisma/client";

/** Sous-ensemble de Coupon utilisé par le calcul — évite de dépendre du
 * type Coupon complet (Decimal, relations...) pour rester facilement testable. */
export interface CouponDiscountInput {
  type: "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIPPING" | string;
  value: number | Prisma.Decimal;
}

/** Remise appliquée au sous-total du panier — FREE_SHIPPING n'affecte jamais
 * le sous-total, seuls les frais de livraison (gérés au checkout, voir
 * orders.service.ts) sont impactés. Jamais négative, jamais > subtotal. */
export function calculateCouponDiscount(subtotal: number, coupon: CouponDiscountInput | null): number {
  if (!coupon) return 0;
  const value = Number(coupon.value);
  if (coupon.type === "PERCENTAGE") return Math.round((subtotal * value) / 100);
  if (coupon.type === "FIXED_AMOUNT") return Math.min(value, subtotal);
  return 0;
}
