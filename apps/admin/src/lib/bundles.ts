import { apiFetch } from "./api-client";

export interface AdminBundleItem {
  id: string;
  quantity: number;
  product: { id: string; nameFr: string; sku: string };
}

export interface AdminBundle {
  id: string;
  name: string;
  bundlePrice: string;
  status: "DRAFT" | "SCHEDULED" | "ACTIVE" | "ENDED";
  items: AdminBundleItem[];
}

export interface UpsertBundlePayload {
  name: string;
  bundlePrice: number;
  status?: string;
  items: { productId: string; quantity?: number }[];
}

export const listBundles = () => apiFetch<AdminBundle[]>("/bundles");
export const createBundle = (payload: UpsertBundlePayload) =>
  apiFetch<AdminBundle>("/bundles", { method: "POST", body: JSON.stringify(payload) });
export const removeBundle = (id: string) => apiFetch<{ ok: boolean }>(`/bundles/${id}`, { method: "DELETE" });
