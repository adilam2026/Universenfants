import { notFound } from "next/navigation";
import { Heart, Share2, Star } from "lucide-react";
import { getProductBySlug, getProducts } from "@/lib/api";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function dh(value: string | number) {
  return `${Number(value).toLocaleString("fr-FR")} DH`;
}

export default async function ProductPage({ params }: PageProps<"/produit/[slug]">) {
  const { slug } = await params;
  const product = await getProductBySlug(slug).catch(() => null);
  if (!product) notFound();

  const similar = await getProducts({ category: product.category.slug, limit: 4 });
  const hasPromo = product.promoPrice !== null;
  const stockLabel =
    product.available <= 0 ? "Rupture de stock" : product.available <= 3 ? `Plus que ${product.available} exemplaires disponibles` : "En stock";

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-7 py-4">
      <p className="text-xs text-muted-foreground mb-4">
        Accueil › {product.category.nameFr} › {product.nameFr}
      </p>
      <div className="grid md:grid-cols-2 gap-8">
        <div className="aspect-square rounded-3xl bg-brand-primary-soft flex items-center justify-center text-8xl">🧸</div>

        <div>
          <p className="text-xs font-bold uppercase text-muted-foreground">
            {product.brand?.name} · SKU {product.sku}
          </p>
          <h1 className="font-display text-2xl font-extrabold mt-1">{product.nameFr}</h1>
          <div className="flex items-center gap-1 mt-2 text-brand-highlight">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="size-3.5" fill={product.avgRating && i < Math.round(product.avgRating) ? "currentColor" : "none"} />
            ))}
            <span className="text-xs text-muted-foreground ml-1">
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

          {product.shortDescFr && <p className="mt-4 text-sm text-muted-foreground">{product.shortDescFr}</p>}
          {product.ageMin != null && (
            <p className="mt-3 text-sm">
              Âge recommandé : <strong>{product.ageMin}-{product.ageMax} ans</strong>
            </p>
          )}

          <div className="mt-6 flex items-center gap-2.5 sticky bottom-20 md:static bg-card md:bg-transparent rounded-2xl md:rounded-none border md:border-0 border-border p-3 md:p-0 shadow-lg md:shadow-none">
            <Button variant="outline" size="icon" aria-label="Favoris">
              <Heart className="size-4" />
            </Button>
            <Button variant="cta" className="flex-1" disabled={product.available <= 0}>
              {product.available <= 0 ? "Indisponible" : `Ajouter au panier — ${dh(product.promoPrice ?? product.price)}`}
            </Button>
          </div>
          <Button variant="ghost" size="sm" className="mt-2.5">
            <Share2 className="size-4" /> Partager ce produit
          </Button>
        </div>
      </div>

      {similar.items.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-xl font-extrabold mb-3.5">Vous aimerez aussi</h2>
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
