import { notFound } from "next/navigation";
import { Heart, Share2, Star } from "lucide-react";
import { getTranslations, getLocale, setRequestLocale } from "next-intl/server";
import { getProductBySlug, getProducts } from "@/lib/api";
import { localized } from "@/lib/localized";
import { ProductCard } from "@/components/product-card";
import { ProductGallery } from "@/components/product-gallery";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function dh(value: string | number) {
  return `${Number(value).toLocaleString("fr-FR")} DH`;
}

export default async function ProductPage({ params }: PageProps<"/[locale]/produit/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("product");
  const currentLocale = await getLocale();

  const product = await getProductBySlug(slug).catch(() => null);
  if (!product) notFound();

  const similar = await getProducts({ category: product.category.slug, limit: 4 });
  const hasPromo = product.promoPrice !== null;
  const stockLabel =
    product.available <= 0 ? t("outOfStock") : product.available <= 3 ? t("lowStock", { n: product.available }) : t("inStock");
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
            {product.brand?.name} · {t("sku")} {product.sku}
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

          <div className="flex items-baseline gap-3 mt-4">
            <span className="font-display text-3xl font-extrabold">{dh(product.promoPrice ?? product.price)}</span>
            {hasPromo && (
              <>
                <span className="text-lg text-muted-foreground line-through">{dh(product.price)}</span>
                <Badge variant="cta">-{Math.round((1 - Number(product.promoPrice) / Number(product.price)) * 100)}%</Badge>
              </>
            )}
          </div>

          <p className="mt-3 text-sm font-bold" style={{ color: product.available <= 0 ? "var(--destructive)" : product.available <= 3 ? "var(--brand-warning)" : "var(--brand-success)" }}>
            {stockLabel}
          </p>

          {shortDesc && <p className="mt-4 text-sm text-muted-foreground">{shortDesc}</p>}
          {product.ageMin != null && (
            <p className="mt-3 text-sm">
              {t("recommendedAge")} : <strong>{product.ageMin}-{product.ageMax} {t("years")}</strong>
            </p>
          )}

          <div className="mt-6 flex items-center gap-2.5 sticky bottom-20 md:static bg-card md:bg-transparent rounded-2xl md:rounded-none border md:border-0 border-border p-3 md:p-0 shadow-lg md:shadow-none">
            <Button variant="outline" size="icon" aria-label={t("favorites")}>
              <Heart className="size-4" />
            </Button>
            {product.available <= 0 ? (
              <Button variant="cta" className="flex-1" disabled>
                {t("unavailable")}
              </Button>
            ) : (
              <AddToCartButton productId={product.id} className="flex-1 px-5 py-2.5 text-sm font-bold">
                {t("addToCartPrice", { price: dh(product.promoPrice ?? product.price) })}
              </AddToCartButton>
            )}
          </div>
          <Button variant="ghost" size="sm" className="mt-2.5">
            <Share2 className="size-4" /> {t("share")}
          </Button>
        </div>
      </div>

      {similar.items.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-xl font-extrabold mb-3.5">{t("similar")}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
            {similar.items.filter((p) => p.id !== product.id).slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
