import { apiFetch, getStaffToken } from "./api-client";

export interface AdminProductImage {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  order: number;
}

export interface AdminProductVariant {
  id: string;
  sku: string;
  label: string;
  price: string | null;
  costPrice: string | null;
  stock: number;
  reservedStock: number;
  image: string | null;
}

export interface VariantPayload {
  sku: string;
  label: string;
  price?: number;
  costPrice?: number;
  stock?: number;
  image?: string;
}

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
  images: AdminProductImage[];
  variants: AdminProductVariant[];
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

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
const UPLOAD_TIMEOUT_MS = 30_000;

export async function uploadProductImage(productId: string, file: File): Promise<AdminProductImage[]> {
  const formData = new FormData();
  formData.append("file", file);
  const token = getStaffToken();
  const res = await fetch(`${API_URL}/products/${productId}/images`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
    signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = Array.isArray(body.message) ? body.message.join(" — ") : body.message;
    throw new Error(message ?? `Erreur (${res.status})`);
  }
  return res.json();
}

export const removeProductImage = (productId: string, imageId: string) =>
  apiFetch<AdminProductImage[]>(`/products/${productId}/images/${imageId}`, { method: "DELETE" });

export const reorderProductImages = (productId: string, imageIds: string[]) =>
  apiFetch<AdminProductImage[]>(`/products/${productId}/images/reorder`, { method: "PATCH", body: JSON.stringify({ imageIds }) });

export const createVariant = (productId: string, payload: VariantPayload) =>
  apiFetch<AdminProductVariant[]>(`/products/${productId}/variants`, { method: "POST", body: JSON.stringify(payload) });

export const updateVariant = (productId: string, variantId: string, payload: VariantPayload) =>
  apiFetch<AdminProductVariant[]>(`/products/${productId}/variants/${variantId}`, { method: "PATCH", body: JSON.stringify(payload) });

export const removeVariant = (productId: string, variantId: string) =>
  apiFetch<AdminProductVariant[]>(`/products/${productId}/variants/${variantId}`, { method: "DELETE" });

export interface StockMovementEntry {
  id: string;
  previousStock: number;
  newStock: number;
  reason: string;
  createdAt: string;
  product: { nameFr: string; sku: string };
  variant: { label: string; sku: string } | null;
  staffUser: { name: string } | null;
  order: { orderNumber: string } | null;
}

export const listStockMovements = (params: { productId?: string; page?: number } = {}) => {
  const search = new URLSearchParams();
  if (params.productId) search.set("productId", params.productId);
  if (params.page) search.set("page", String(params.page));
  const query = search.toString();
  return apiFetch<{ items: StockMovementEntry[]; total: number; page: number; limit: number; totalPages: number }>(
    `/products/admin/stock-movements${query ? `?${query}` : ""}`,
  );
};

export interface StockValuation {
  totalValue: number;
  totalUnits: number;
  lines: { productId: string; name: string; sku: string; stock: number; costPrice: number; value: number }[];
}

export const getStockValuation = () => apiFetch<StockValuation>("/products/admin/stock-valuation");

export interface ProductSearchResult {
  id: string;
  nameFr: string;
  sku: string;
}

export const searchProducts = (q: string) =>
  apiFetch<{ items: ProductSearchResult[] }>(`/products?q=${encodeURIComponent(q)}&limit=10`);

export interface UpsellEntry {
  id: string;
  suggestedProduct: { id: string; nameFr: string; sku: string; images: { url: string }[] };
}

export const listProductUpsells = (productId: string) => apiFetch<UpsellEntry[]>(`/products/${productId}/upsells`);
export const addProductUpsell = (productId: string, suggestedProductId: string) =>
  apiFetch<UpsellEntry[]>(`/products/${productId}/upsells`, { method: "POST", body: JSON.stringify({ suggestedProductId }) });
export const removeProductUpsell = (productId: string, upsellId: string) =>
  apiFetch<UpsellEntry[]>(`/products/${productId}/upsells/${upsellId}`, { method: "DELETE" });
