import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations, getLocale, setRequestLocale } from "next-intl/server";
import { getCategoryTree, getActiveBrands, getProducts, type Category } from "@/lib/api";
import { localized } from "@/lib/localized";
import { ProductCard } from "@/components/product-card";
import { FilterSidebar, SortSelect, MobileFilterButton, ActiveFiltersBar } from "@/components/product-filters";

// getCategoryTree() ne renvoie que les catégories racines, avec leurs enfants
// nichés dans `children` — un simple `.find()` sur ce tableau ne trouve
// jamais une sous-catégorie, ce qui faisait 404 toute page /categorie/<slug>
// d'une sous-catégorie (et generateMetadata retournait silencieusement {}
// pour la même raison).
function findCategory(categories: Category[], slug: string): Category | undefined {
  for (const c of categories) {
    if (c.slug === slug) return c;
    const found = findCategory(c.children ?? [], slug);
    if (found) return found;
  }
  return undefined;
}

// Sans generateMetadata, chaque page catégorie héritait du titre/description
// générique du site (layout.tsx) au lieu d'un titre distinctif par univers
// de jouets — même lacune SEO que les fiches produit (voir produit/[slug]).
export async function generateMetadata({ params }: PageProps<"/[locale]/categorie/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const categories = await getCategoryTree().catch(() => []);
  const current = findCategory(categories, slug);
  if (!current) return {};
  const name = localized(current.nameFr, current.nameAr, locale);
  // Le SEO manuel (metaTitle/metaDescription, saisi dans l'admin) prime sur
  // la description générée automatiquement — sans ce repli, les champs SEO
  // remplis côté admin catégorie n'avaient jamais d'effet sur le HTML rendu.
  const title = (locale === "ar" ? undefined : current.metaTitle) || name;
  const description =
    current.metaDescription ||
    (locale === "ar"
      ? `اكتشف تشكيلتنا من ${name} للأطفال — التوصيل في جميع أنحاء المغرب.`
      : `Découvrez notre sélection de ${name.toLowerCase()} pour enfants — livraison partout au Maroc.`);
  return { title, description, openGraph: { title, description } };
}

export default async function CategoryPage({
  params,
  searchParams,
}: PageProps<"/[locale]/categorie/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const sort = typeof sp.sort === "string" ? sp.sort : undefined;
  const ageMin = typeof sp.ageMin === "string" ? Number(sp.ageMin) : undefined;
  const ageMax = typeof sp.ageMax === "string" ? Number(sp.ageMax) : undefined;
  const priceMin = typeof sp.priceMin === "string" ? Number(sp.priceMin) : undefined;
  const priceMax = typeof sp.priceMax === "string" ? Number(sp.priceMax) : undefined;
  const brand = typeof sp.brand === "string" ? sp.brand : undefined;
  const promoOnly = sp.promo === "1" ? true : undefined;
  const inStockOnly = sp.inStock === "1" ? true : undefined;
  const t = await getTranslations("category");
  const tSearch = await getTranslations("search");
  const currentLocale = await getLocale();

  // Deux appels indépendants (le catalogue de catégories ne dépend pas des
  // produits filtrés, et inversement) : les lancer en parallèle plutôt qu'en
  // séquence évite d'ajouter un aller-retour réseau complet à chaque
  // changement de tri/filtre — coût negligeable en local mais réel en
  // production, l'API et la base ne vivant pas dans la même région que le
  // frontend (voir FETCH_TIMEOUT_MS ci-dessus, déjà relevé pour la même
  // raison). `/recherche` applique déjà ce même pattern.
  const [categories, brands, results] = await Promise.all([
    getCategoryTree(),
    getActiveBrands(),
    getProducts({ category: slug, sort: sort as never, ageMin, ageMax, priceMin, priceMax, brand, promoOnly, inStockOnly }),
  ]);
  const current = findCategory(categories, slug);
  if (!current) notFound();

  return (
    <div className="mx-auto max-w-7xl 2xl:max-w-[1600px] px-4 md:px-7 py-4">
      <p className="text-xs text-muted-foreground mb-3">{t("home")} › {localized(current.nameFr, current.nameAr, currentLocale)}</p>
      <h1 className="font-display text-2xl font-extrabold mb-5">
        {current.image} {localized(current.nameFr, current.nameAr, currentLocale)}
      </h1>
      <div className="flex gap-7 xl:gap-10">
        <FilterSidebar activeSlug={slug} categories={categories} brands={brands} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3.5">
            <span className="text-sm text-muted-foreground">{tSearch("resultsCount", { count: results.total })}</span>
            <div className="flex gap-2">
              <MobileFilterButton />
              <SortSelect />
            </div>
          </div>
          <ActiveFiltersBar brands={brands} />
          {results.items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">{t("noProducts")}</p>
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
