import { apiFetch } from "./api-client";

export interface AdminPromotion {
  id: string;
  name: string;
  type: "PERCENTAGE" | "FIXED_AMOUNT";
  value: string;
  scope: "CATEGORY" | "BRAND" | "STORE";
  categoryId: string | null;
  brandId: string | null;
  startAt: string;
  endAt: string;
  status: "DRAFT" | "SCHEDULED" | "ACTIVE" | "ENDED";
  category: { nameFr: string } | null;
  brand: { name: string } | null;
}

export interface UpsertPromotionPayload {
  name: string;
  type: "PERCENTAGE" | "FIXED_AMOUNT";
  value: number;
  scope: "CATEGORY" | "BRAND" | "STORE";
  categoryId?: string;
  brandId?: string;
  startAt: string;
  endAt: string;
  status?: "DRAFT" | "SCHEDULED" | "ACTIVE" | "ENDED";
}

export const listPromotions = () => apiFetch<AdminPromotion[]>("/promotions");
export const createPromotion = (payload: UpsertPromotionPayload) =>
  apiFetch<AdminPromotion>("/promotions", { method: "POST", body: JSON.stringify(payload) });
export const updatePromotion = (id: string, payload: UpsertPromotionPayload) =>
  apiFetch<AdminPromotion>(`/promotions/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
