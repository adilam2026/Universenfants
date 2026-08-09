import { apiFetch } from "./api-client";

export interface AdminCategory {
  id: string;
  nameFr: string;
  nameAr: string | null;
  slug: string;
  parentId: string | null;
  image: string | null;
  status: "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED";
  order: number;
}

export interface AdminBrand {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  description: string | null;
  website: string | null;
}

export interface UpsertCategoryPayload {
  nameFr: string;
  nameAr?: string;
  slug: string;
  parentId?: string;
  image?: string;
  status?: "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED";
}

export interface UpsertBrandPayload {
  name: string;
  slug: string;
  logo?: string;
  description?: string;
  website?: string;
}

export const listCategories = () => apiFetch<AdminCategory[]>("/categories");
export const createCategory = (payload: UpsertCategoryPayload) =>
  apiFetch<AdminCategory>("/categories", { method: "POST", body: JSON.stringify(payload) });
export const updateCategory = (id: string, payload: UpsertCategoryPayload) =>
  apiFetch<AdminCategory>(`/categories/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
export const archiveCategory = (id: string) => apiFetch<AdminCategory>(`/categories/${id}`, { method: "DELETE" });

export const listBrands = () => apiFetch<AdminBrand[]>("/brands");
export const createBrand = (payload: UpsertBrandPayload) =>
  apiFetch<AdminBrand>("/brands", { method: "POST", body: JSON.stringify(payload) });
export const updateBrand = (id: string, payload: UpsertBrandPayload) =>
  apiFetch<AdminBrand>(`/brands/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
