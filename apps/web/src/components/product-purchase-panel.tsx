"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { WishlistButton } from "@/components/wishlist-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProductDetail } from "@/lib/api";

function dh(value: string | number) {
  return `${Number(value).toLocaleString("fr-FR")} DH`;
}

export function ProductPurchasePanel({ product }: { product: ProductDetail }) {
  const t = useTranslations("product");
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(product.variants[0]?.id ?? null);
  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId) ?? null;

  const price = selectedVariant?.price ?? product.promoPrice ?? product.price;
  const hasPromo = !selectedVariant?.price && product.promoPrice !== null;
  const available = selectedVariant ? selectedVariant.available : product.available;
  const stockLabel = available <= 0 ? t("outOfStock") : available <= 3 ? t("lowStock", { n: available }) : t("inStock");

  return (
    <div>
      <div className="flex items-baseline gap-3 mt-4">
        <span className="font-display text-3xl font-extrabold">{dh(price)}</span>
        {hasPromo && (
          <>
            <span className="text-lg text-muted-foreground line-through">{dh(product.price)}</span>
            <Badge variant="cta">-{Math.round((1 - Number(product.promoPrice) / Number(product.price)) * 100)}%</Badge>
          </>
        )}
      </div>

      <p
        className="mt-3 text-sm font-bold"
        style={{ color: available <= 0 ? "var(--destructive)" : available <= 3 ? "var(--brand-warning)" : "var(--brand-success)" }}
      >
        {stockLabel}
      </p>

      {product.variants.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-bold uppercase text-muted-foreground mb-1.5">{t("variant")}</p>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedVariantId(v.id)}
                disabled={v.available <= 0}
                className={cn(
                  "rounded-full border-[1.5px] px-4 py-1.5 text-sm font-semibold transition-colors disabled:opacity-40 disabled:line-through",
                  v.id === selectedVariantId
                    ? "border-brand-cta bg-brand-cta text-brand-cta-foreground"
                    : "border-border bg-transparent text-foreground hover:bg-secondary",
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center gap-2.5 fixed inset-x-4 bottom-20 z-30 md:static md:inset-auto bg-card md:bg-transparent rounded-2xl md:rounded-none border md:border-0 border-border p-3 md:p-0 shadow-lg md:shadow-none">
        <WishlistButton
          product={product}
          className="inline-flex size-10 items-center justify-center rounded-full border-[1.5px] border-border bg-transparent text-foreground hover:bg-secondary transition-colors"
        />
        {available <= 0 ? (
          <Button variant="cta" className="flex-1" disabled>
            {t("unavailable")}
          </Button>
        ) : (
          <AddToCartButton
            productId={product.id}
            variantId={selectedVariant?.id}
            className="flex-1 px-5 py-2.5 text-sm font-bold"
          >
            {t("addToCartPrice", { price: dh(price) })}
          </AddToCartButton>
        )}
      </div>
      {/* La barre ci-dessus est en `fixed` sur mobile, donc retirée du flux :
          sans cet espaceur, le contenu suivant (bouton Partager, etc.)
          remonte dans son espace et se retrouve caché derrière elle. */}
      <div className="h-24 md:hidden" aria-hidden />
    </div>
  );
}
