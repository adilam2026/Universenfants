import { apiFetch } from "./api-client";

export interface AdminCoupon {
  id: string;
  code: string;
  type: "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIPPING";
  value: string;
  startAt: string;
  endAt: string;
  maxUses: number | null;
  maxUsesPerCustomer: number;
  minCartAmount: string;
  usedCount: number;
  status: "DRAFT" | "SCHEDULED" | "ACTIVE" | "ENDED";
}

export interface UpsertCouponPayload {
  code: string;
  type: "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIPPING";
  value: number;
  startAt: string;
  endAt: string;
  maxUses?: number;
  maxUsesPerCustomer?: number;
  minCartAmount?: number;
  status?: "DRAFT" | "SCHEDULED" | "ACTIVE" | "ENDED";
}

export const listCoupons = () => apiFetch<AdminCoupon[]>("/coupons");
export const createCoupon = (payload: UpsertCouponPayload) =>
  apiFetch<AdminCoupon>("/coupons", { method: "POST", body: JSON.stringify(payload) });
export const updateCoupon = (id: string, payload: UpsertCouponPayload) =>
  apiFetch<AdminCoupon>(`/coupons/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
