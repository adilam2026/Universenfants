// Business constants that must stay configurable server-side (SystemSetting table)
// but need a documented default here for local dev / seeding.
export const DEFAULT_VAT_RATE = 0.2; // 20% — displayed prices are TTC (O2)
export const DEFAULT_LOYALTY_EARN_RATE = 1 / 10; // 1 point per 10 MAD spent
export const DEFAULT_LOYALTY_REDEEM_RATE = 10; // 100 points = 10 MAD discount
export const DEFAULT_LOYALTY_POINTS_EXPIRY_MONTHS = 24;
export const DEFAULT_SHARED_CART_EXPIRY_DAYS = 90;
export const DEFAULT_GLOBAL_FREE_SHIPPING_THRESHOLD = 400; // MAD, city rule takes priority (I7)
export const ORDER_NUMBER_PREFIX = "UE";
