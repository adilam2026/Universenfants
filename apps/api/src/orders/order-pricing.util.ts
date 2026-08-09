/** TVA incluse dans un total TTC (le taux s'applique au HT, pas au TTC —
 * d'où total / (1 + vatRate) pour retrouver le HT avant de soustraire). */
export function calculateVat(total: number, vatRate: number): number {
  return Math.round(total - total / (1 + vatRate));
}

export interface LoyaltyRedemption {
  loyaltyDiscount: number;
  pointsToRedeem: number;
}

/** §219 : les points sont calculés sur le montant produits uniquement (après
 * remise coupon, hors livraison) — jamais plus que ce qu'il reste à payer,
 * jamais plus que ce que le solde de points du client permet réellement. */
export function calculateLoyaltyRedemption(
  subtotal: number,
  couponDiscount: number,
  pointsBalance: number,
  redeemRate: number,
): LoyaltyRedemption {
  // redeemRate est un diviseur : le champ Paramètres qui le pilote n'autorise
  // que value >= 0, donc 0 est une valeur saisissable. Sans ce garde-fou,
  // pointsBalance / 0 vaut Infinity en JS (pas une erreur) et loyaltyDiscount
  // devient égal au sous-total entier — n'importe quel client avec ne
  // serait-ce qu'un point de fidélité obtiendrait sa commande gratuite, sans
  // qu'aucun point ne soit réellement débité (pointsToRedeem = 0).
  if (redeemRate <= 0) return { loyaltyDiscount: 0, pointsToRedeem: 0 };
  const maxDiscount = Math.max(0, subtotal - couponDiscount);
  const affordable = Math.floor(pointsBalance / redeemRate);
  const loyaltyDiscount = Math.min(affordable, maxDiscount);
  return { loyaltyDiscount, pointsToRedeem: loyaltyDiscount * redeemRate };
}
