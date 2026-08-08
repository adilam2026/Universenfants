import { apiFetch } from "./api-client";

export interface AdminProduct {
  id: string;
  sku: string;
  nameFr: string;
  seoUrl: string;
  price: string;
  promoPrice: string | null;
  costPrice: string;
  stock: number;
  reservedStock: number;
  alertThreshold: number;
  status: string;
  categoryId: string;
  brandId: string | null;
  ageMin: number | null;
  ageMax: number | null;
  targetGender: string;
  barcode: string | null;
  nameAr: string | null;
  shortDescFr: string | null;
  longDescFr: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  category: { id: string; nameFr: string };
  brand: { id: string; name: string } | null;
}

export interface UpsertProductPayload {
  sku: string;
  barcode?: string;
  nameFr: string;
  nameAr?: string;
  shortDescFr?: string;
  longDescFr?: string;
  categoryId: string;
  brandId?: string;
  ageMin?: number;
  ageMax?: number;
  targetGender?: "BOY" | "GIRL" | "UNISEX";
  price: number;
  promoPrice?: number;
  costPrice: number;
  stock?: number;
  alertThreshold?: number;
  seoUrl: string;
  metaTitle?: string;
  metaDescription?: string;
  status?: "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED";
}

export const listAdminProducts = (params: { category?: string; status?: string; lowStock?: boolean } = {}) => {
  const qs = new URLSearchParams();
  if (params.category) qs.set("category", params.category);
  if (params.status) qs.set("status", params.status);
  if (params.lowStock) qs.set("lowStock", "true");
  const query = qs.toString();
  return apiFetch<AdminProduct[]>(`/products/admin${query ? `?${query}` : ""}`);
};

export const getAdminProduct = (id: string) => apiFetch<AdminProduct>(`/products/admin/${id}`);

export const createProduct = (payload: UpsertProductPayload) =>
  apiFetch<AdminProduct>("/products", { method: "POST", body: JSON.stringify(payload) });

export const updateProduct = (id: string, payload: UpsertProductPayload) =>
  apiFetch<AdminProduct>(`/products/${id}`, { method: "PATCH", body: JSON.stringify(payload) });

export const archiveProduct = (id: string) => apiFetch<AdminProduct>(`/products/${id}/archive`, { method: "PATCH" });

export type StockAdjustReason = "SUPPLIER_RECEIPT" | "INVENTORY_CORRECTION" | "RETURN";

export const adjustStock = (id: string, delta: number, reason: StockAdjustReason) =>
  apiFetch<{ stock: number }>(`/products/${id}/stock`, { method: "POST", body: JSON.stringify({ delta, reason }) });
