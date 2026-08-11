import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCategoryTree, getActiveBrands, getProducts } from "@/lib/api";
import { ProductCard } from "@/components/product-card";
import { FilterSidebar, SortSelect, MobileFilterButton, ActiveFiltersBar } from "@/components/product-filters";

export default async function SearchPage({ params, searchParams }: PageProps<"/[locale]/recherche">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const sort = typeof sp.sort === "string" ? sp.sort : undefined;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const ageMin = typeof sp.ageMin === "string" ? Number(sp.ageMin) : undefined;
  const ageMax = typeof sp.ageMax === "string" ? Number(sp.ageMax) : undefined;
  const priceMin = typeof sp.priceMin === "string" ? Number(sp.priceMin) : undefined;
  const priceMax = typeof sp.priceMax === "string" ? Number(sp.priceMax) : undefined;
  const brand = typeof sp.brand === "string" ? sp.brand : undefined;
  const promoOnly = sp.promo === "1" ? true : undefined;
  const inStockOnly = sp.inStock === "1" ? true : undefined;
  const t = await getTranslations("search");

  const [categories, brands, results] = await Promise.all([
    getCategoryTree(),
    getActiveBrands(),
    getProducts({ sort: sort as never, q, ageMin, ageMax, priceMin, priceMax, brand, promoOnly, inStockOnly }),
  ]);

  return (
    <div className="mx-auto max-w-7xl 2xl:max-w-[1600px] px-4 md:px-7 py-4">
      <h1 className="font-display text-xl font-extrabold mb-5">{promoOnly ? t("promoTitle") : t("title")}</h1>
      <div className="flex gap-7 xl:gap-10">
        <FilterSidebar categories={categories} brands={brands} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3.5">
            <span className="text-sm text-muted-foreground">{t("resultsCount", { count: results.total })}</span>
            <div className="flex gap-2">
              <MobileFilterButton />
              <SortSelect />
            </div>
          </div>
          <ActiveFiltersBar brands={brands} />
          {results.items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">{t("noResults")}</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5 xl:gap-5">
              {results.items.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
