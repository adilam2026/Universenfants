const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
// Sans timeout, une API qui ne répond plus bloque le rendu SSR (ou l'appel
// client) indéfiniment au lieu d'échouer et de laisser afficher un fallback.
// Plus généreux que les clients côté navigateur (auth/cart/reviews...) : ces
// appels tournent pendant `next build` (génération statique) ou en
// revalidation ISR en arrière-plan, jamais devant un utilisateur qui
// attend — la latence inter-région (ex: build US, base de données en
// Europe) peut dépasser 10s sur une connexion à froid sans que ce soit un
// vrai problème.
const FETCH_TIMEOUT_MS = 25_000;

export interface Category {
  id: string;
  slug: string;
  nameFr: string;
  nameAr: string | null;
  descriptionFr?: string | null;
  descriptionAr?: string | null;
  image: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  productCount: number;
  children: Category[];
}

export interface ProductImage {
  id: string;
  url: string;
  thumbnailUrl?: string | null;
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
  variants: { id: string; sku: string; label: string; price: string | null; stock: number; available: number; image: string | null }[];
  reviews: { id: string; rating: number; comment: string | null; createdAt: string }[];
  avgRating: number | null;
  upsells: ProductSummary[];
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    // Catalogue public (produits, catégories) : revalidation courte plutôt
    // qu'une requête réseau à chaque rendu — le stock/prix affiché peut
    // avoir jusqu'à 60s de retard, acceptable pour du contenu de navigation.
    next: { revalidate: 60 },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = Array.isArray(body.message) ? body.message.join(" — ") : body.message;
    throw new Error(message ?? `Erreur API (${res.status})`);
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

export interface HeroBanner {
  id: string;
  titleFr: string;
  titleAr: string | null;
  subtitleFr: string | null;
  subtitleAr: string | null;
  imageDesktop: string;
  imageMobile: string;
  link: string | null;
}

export function getActiveHeroBanners() {
  return apiFetch<HeroBanner[]>("/hero-banners/active");
}

export interface BundleItemView {
  productId: string;
  nameFr: string;
  nameAr: string | null;
  seoUrl: string;
  image: string | null;
  quantity: number;
  unitPrice: number;
}

export interface Bundle {
  id: string;
  name: string;
  bundlePrice: number;
  individualTotal: number;
  savings: number;
  items: BundleItemView[];
}

export function getActiveBundles() {
  return apiFetch<Bundle[]>("/bundles/active");
}
