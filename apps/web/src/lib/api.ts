const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export interface Category {
  id: string;
  slug: string;
  nameFr: string;
  nameAr: string | null;
  descriptionFr?: string | null;
  descriptionAr?: string | null;
  image: string | null;
  productCount: number;
  children: Category[];
}

export interface ProductImage {
  id: string;
  url: string;
}

export interface ProductSummary {
  id: string;
  sku: string;
  nameFr: string;
  nameAr: string | null;
  seoUrl: string;
  price: string;
  promoPrice: string | null;
  ageMin: number | null;
  ageMax: number | null;
  stock: number;
  available: number;
  images: ProductImage[];
  brand: { name: string; slug: string } | null;
  category: { nameFr: string; nameAr?: string | null; slug: string };
}

export interface ProductListResult {
  items: ProductSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProductDetail extends ProductSummary {
  shortDescFr: string | null;
  shortDescAr: string | null;
  longDescFr: string | null;
  longDescAr: string | null;
  variants: { id: string; label: string; price: string | null; stock: number }[];
  reviews: { id: string; rating: number; comment: string | null; createdAt: string }[];
  avgRating: number | null;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Erreur API (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export function getCategoryTree() {
  return apiFetch<Category[]>("/categories/tree");
}

export function getCategoryBySlug(slug: string) {
  return apiFetch<{ id: string; slug: string; nameFr: string }>(`/categories/${slug}`);
}

export function getProducts(params: Record<string, string | number | boolean | undefined> = {}) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) qs.set(key, String(value));
  }
  const query = qs.toString();
  return apiFetch<ProductListResult>(`/products${query ? `?${query}` : ""}`);
}

export function getProductBySlug(slug: string) {
  return apiFetch<ProductDetail>(`/products/${slug}`);
}
