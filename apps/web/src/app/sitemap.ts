import type { MetadataRoute } from "next";
import { getCategoryTree, getProducts, type Category } from "@/lib/api";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const LOCALES = ["fr", "ar"] as const;
const MAX_PRODUCT_PAGES = 20;

function flattenCategories(categories: Category[]): Category[] {
  return categories.flatMap((c) => [c, ...flattenCategories(c.children)]);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of LOCALES) {
    entries.push({ url: `${SITE_URL}/${locale}`, changeFrequency: "daily", priority: 1 });
  }

  const categories = await getCategoryTree().catch(() => []);
  for (const category of flattenCategories(categories)) {
    for (const locale of LOCALES) {
      entries.push({ url: `${SITE_URL}/${locale}/categorie/${category.slug}`, changeFrequency: "daily", priority: 0.8 });
    }
  }

  for (let page = 1; page <= MAX_PRODUCT_PAGES; page++) {
    const result = await getProducts({ page, limit: 100 }).catch(() => null);
    if (!result || result.items.length === 0) break;
    for (const product of result.items) {
      for (const locale of LOCALES) {
        entries.push({ url: `${SITE_URL}/${locale}/produit/${product.seoUrl}`, changeFrequency: "weekly", priority: 0.6 });
      }
    }
    if (page >= result.totalPages) break;
  }

  return entries;
}
