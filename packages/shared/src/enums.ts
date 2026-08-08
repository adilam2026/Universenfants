// Shared enums mirrored from the Prisma schema (apps/api/prisma/schema.prisma).
// Kept as plain string unions here so apps/web and apps/admin can depend on
// this package without pulling in @prisma/client — all data still flows
// through the API (see CDC Partie 8 §140 "Toutes les données doivent transiter par API").

export const OrderStatus = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  PREPARING: "PREPARING",
  SHIPPED: "SHIPPED",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

export const PaymentStatus = {
  PENDING: "PENDING",
  PAID: "PAID",
  PARTIAL: "PARTIAL",
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const ProductStatus = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  ARCHIVED: "ARCHIVED",
} as const;
export type ProductStatus = (typeof ProductStatus)[keyof typeof ProductStatus];

export const CouponType = {
  PERCENTAGE: "PERCENTAGE",
  FIXED_AMOUNT: "FIXED_AMOUNT",
  FREE_SHIPPING: "FREE_SHIPPING",
} as const;
export type CouponType = (typeof CouponType)[keyof typeof CouponType];

export const PromotionType = {
  PERCENTAGE: "PERCENTAGE",
  FIXED_AMOUNT: "FIXED_AMOUNT",
} as const;
export type PromotionType = (typeof PromotionType)[keyof typeof PromotionType];

export const PromotionScope = {
  CATEGORY: "CATEGORY",
  BRAND: "BRAND",
  STORE: "STORE",
} as const;
export type PromotionScope = (typeof PromotionScope)[keyof typeof PromotionScope];

export const StatusPeriod = {
  DRAFT: "DRAFT",
  SCHEDULED: "SCHEDULED",
  ACTIVE: "ACTIVE",
  ENDED: "ENDED",
} as const;
export type StatusPeriod = (typeof StatusPeriod)[keyof typeof StatusPeriod];

export const LoyaltyTransactionType = {
  EARN: "EARN",
  REDEEM: "REDEEM",
  CANCEL: "CANCEL",
  EXPIRE: "EXPIRE",
} as const;
export type LoyaltyTransactionType = (typeof LoyaltyTransactionType)[keyof typeof LoyaltyTransactionType];

export const ReviewStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;
export type ReviewStatus = (typeof ReviewStatus)[keyof typeof ReviewStatus];

export const StockMovementReason = {
  SUPPLIER_RECEIPT: "SUPPLIER_RECEIPT",
  INVENTORY_CORRECTION: "INVENTORY_CORRECTION",
  ORDER_CANCELLATION: "ORDER_CANCELLATION",
  ORDER_DELIVERED_DEDUCTION: "ORDER_DELIVERED_DEDUCTION",
  RETURN: "RETURN",
  RESERVATION: "RESERVATION",
  RESERVATION_RELEASE: "RESERVATION_RELEASE",
} as const;
export type StockMovementReason = (typeof StockMovementReason)[keyof typeof StockMovementReason];

export const CartStatus = {
  ACTIVE: "ACTIVE",
  CONVERTED: "CONVERTED",
  EXPIRED: "EXPIRED",
} as const;
export type CartStatus = (typeof CartStatus)[keyof typeof CartStatus];

export const TargetGender = {
  BOY: "BOY",
  GIRL: "GIRL",
  UNISEX: "UNISEX",
} as const;
export type TargetGender = (typeof TargetGender)[keyof typeof TargetGender];

export const Locale = {
  FR: "FR",
  AR: "AR",
} as const;
export type Locale = (typeof Locale)[keyof typeof Locale];

export const StaffRoleCode = {
  SUPER_ADMIN: "SUPER_ADMIN",
  CATALOG_MANAGER: "CATALOG_MANAGER",
  ORDERS_MANAGER: "ORDERS_MANAGER",
  MARKETING_MANAGER: "MARKETING_MANAGER",
  STOCK_MANAGER: "STOCK_MANAGER",
  ANALYTICS_MANAGER: "ANALYTICS_MANAGER",
  CUSTOMER_SERVICE: "CUSTOMER_SERVICE",
  READ_ONLY: "READ_ONLY",
} as const;
export type StaffRoleCode = (typeof StaffRoleCode)[keyof typeof StaffRoleCode];

// Fine-grained permission codes (CDC Partie 9 §180) — independent from role,
// a role grants a default set, a StaffUser can get extra grants or explicit denies.
export const PermissionCode = {
  PRODUCT_READ: "product.read",
  PRODUCT_CREATE: "product.create",
  PRODUCT_UPDATE: "product.update",
  PRODUCT_DELETE: "product.delete",
  ORDER_READ: "order.read",
  ORDER_UPDATE: "order.update",
  ORDER_CANCEL: "order.cancel",
  CUSTOMER_READ: "customer.read",
  CUSTOMER_EXPORT: "customer.export",
  SHIPPING_READ: "shipping.read",
  SHIPPING_UPDATE: "shipping.update",
  COUPON_CREATE: "coupon.create",
  COUPON_UPDATE: "coupon.update",
  PROMOTION_CREATE: "promotion.create",
  PROMOTION_UPDATE: "promotion.update",
  STOCK_UPDATE: "stock.update",
  ANALYTICS_READ: "analytics.read",
  ANALYTICS_EXPORT: "analytics.export",
  USER_MANAGE: "user.manage",
  SETTINGS_MANAGE: "settings.manage",
} as const;
export type PermissionCode = (typeof PermissionCode)[keyof typeof PermissionCode];

export const EmailTrigger = {
  ACCOUNT_CREATED: "ACCOUNT_CREATED",
  ORDER_CONFIRMED: "ORDER_CONFIRMED",
  PASSWORD_RESET: "PASSWORD_RESET",
  CART_ABANDONED: "CART_ABANDONED",
  WISHLIST_BACK_IN_STOCK: "WISHLIST_BACK_IN_STOCK",
  WISHLIST_PRICE_DROP: "WISHLIST_PRICE_DROP",
  ORDER_SHIPPED: "ORDER_SHIPPED",
  ORDER_DELIVERED: "ORDER_DELIVERED",
} as const;
export type EmailTrigger = (typeof EmailTrigger)[keyof typeof EmailTrigger];
