import { apiFetch } from "./api-client";

export interface AdminCategory {
  id: string;
  nameFr: string;
  slug: string;
}

export interface AdminBrand {
  id: string;
  name: string;
  slug: string;
}

export const listCategories = () => apiFetch<AdminCategory[]>("/categories");
export const listBrands = () => apiFetch<AdminBrand[]>("/brands");
