import { notFound } from "next/navigation";
import { getTranslations, getLocale, setRequestLocale } from "next-intl/server";
import { getCategoryTree, getProducts } from "@/lib/api";
import { localized } from "@/lib/localized";
import { ProductCard } from "@/components/product-card";
import { FilterSidebar, SortSelect, MobileFilterButton } from "@/components/product-filters";

export default async function CategoryPage({
  params,
  searchParams,
}: PageProps<"/[locale]/categorie/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const sort = typeof sp.sort === "string" ? sp.sort : undefined;
  const t = await getTranslations("category");
  const tSearch = await getTranslations("search");
  const currentLocale = await getLocale();

  const categories = await getCategoryTree();
  const current = categories.find((c) => c.slug === slug);
  if (!current) notFound();

  const results = await getProducts({ category: slug, sort: sort as never });

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-7 py-4">
      <p className="text-xs text-muted-foreground mb-3">{t("home")} › {localized(current.nameFr, current.nameAr, currentLocale)}</p>
      <h1 className="font-display text-2xl font-extrabold mb-5">
        {current.image} {localized(current.nameFr, current.nameAr, currentLocale)}
      </h1>
      <div className="flex gap-7">
        <FilterSidebar activeSlug={slug} categories={categories} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3.5">
            <span className="text-sm text-muted-foreground">{tSearch("resultsCount", { count: results.total })}</span>
            <div className="flex gap-2">
              <MobileFilterButton />
              <SortSelect />
            </div>
          </div>
          {results.items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">{t("noProducts")}</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
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
