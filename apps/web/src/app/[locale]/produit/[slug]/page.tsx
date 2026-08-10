import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Share2, Star } from "lucide-react";
import { getTranslations, getLocale, setRequestLocale } from "next-intl/server";
import { getProductBySlug, getProducts } from "@/lib/api";
import { localized } from "@/lib/localized";
import { ProductCard } from "@/components/product-card";
import { ProductGallery } from "@/components/product-gallery";
import { ProductPurchasePanel } from "@/components/product-purchase-panel";
import { WriteReviewForm } from "@/components/write-review-form";
import { Button } from "@/components/ui/button";

// Sans generateMetadata, chaque fiche produit héritait du titre/description
// générique du site (layout.tsx) — un problème de fond pour le SEO d'un
// site e-commerce, où chaque page produit doit pouvoir se distinguer dans
// les résultats de recherche.
export async function generateMetadata({ params }: PageProps<"/[locale]/produit/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = await getProductBySlug(slug).catch(() => null);
  if (!product) return {};
  const name = localized(product.nameFr, product.nameAr, locale);
  const description = localized(product.shortDescFr ?? "", product.shortDescAr, locale) || undefined;
  const image = product.images[0]?.url;
  return {
    title: name,
    description,
    openGraph: { title: name, description, images: image ? [image] : undefined },
  };
}

export default async function ProductPage({ params }: PageProps<"/[locale]/produit/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("product");
  const currentLocale = await getLocale();

  const product = await getProductBySlug(slug).catch(() => null);
  if (!product) notFound();

  const similar = await getProducts({ category: product.category.slug, limit: 4 });
  const name = localized(product.nameFr, product.nameAr, currentLocale);
  const shortDesc = localized(product.shortDescFr ?? "", product.shortDescAr, currentLocale);
  const categoryName = localized(product.category.nameFr, product.category.nameAr, currentLocale);

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-7 py-4">
      <p className="text-xs text-muted-foreground mb-4">
        {categoryName} › {name}
      </p>
      <div className="grid md:grid-cols-2 gap-8">
        <ProductGallery images={product.images} alt={name} />

        <div>
          <p className="text-xs font-bold uppercase text-muted-foreground">
            {product.brand?.name ? `${product.brand.name} · ` : ""}
            {t("sku")} {product.sku}
          </p>
          <h1 className="font-display text-2xl font-extrabold mt-1">{name}</h1>
          <div className="flex items-center gap-1 mt-2 text-brand-highlight">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="size-3.5" fill={product.avgRating && i < Math.round(product.avgRating) ? "currentColor" : "none"} />
            ))}
            <span className="text-xs text-muted-foreground ml-1 rtl:ml-0 rtl:mr-1">
              {product.avgRating ? product.avgRating.toFixed(1) : "—"} ({product.reviews.length})
            </span>
          </div>

          {shortDesc && <p className="mt-4 text-sm text-muted-foreground">{shortDesc}</p>}
          {product.ageMin != null && (
            <p className="mt-3 text-sm">
              {t("recommendedAge")} : <strong>{product.ageMin}-{product.ageMax} {t("years")}</strong>
            </p>
          )}

          <ProductPurchasePanel product={product} />

          <Button variant="ghost" size="sm" className="mt-2.5">
            <Share2 className="size-4" /> {t("share")}
          </Button>
        </div>
      </div>

      <section className="mt-12 grid md:grid-cols-2 gap-8">
        <div>
          <h2 className="font-display text-xl font-extrabold mb-3.5">{t("reviewsTitle")}</h2>
          {product.reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noReviews")}</p>
          ) : (
            <div className="flex flex-col gap-3.5">
              {product.reviews.map((r) => (
                <div key={r.id} className="rounded-2xl border border-border bg-card p-3.5">
                  <div className="flex items-center gap-1 text-brand-highlight">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="size-3.5" fill={i < r.rating ? "currentColor" : "none"} />
                    ))}
                  </div>
                  {r.comment && <p className="text-sm mt-1.5">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
        <WriteReviewForm productId={product.id} />
      </section>

      {(() => {
        // Upsell/cross-sell curé par l'admin (Produits associés) prime sur
        // le repli par catégorie — plus pertinent qu'un simple "même
        // catégorie" quand il a été configuré côté Back-Office.
        const recommended = product.upsells.length > 0 ? product.upsells : similar.items.filter((p) => p.id !== product.id);
        return (
          recommended.length > 0 && (
            <section className="mt-12">
              <h2 className="font-display text-xl font-extrabold mb-3.5">{t("similar")}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                {recommended.slice(0, 4).map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          )
        );
      })()}
    </div>
  );
}
