"use client";

import { useTranslations, useLocale } from "next-intl";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { ProductSummary } from "@/lib/api";
import { localized } from "@/lib/localized";
import { Badge } from "@/components/ui/badge";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { WishlistButton } from "@/components/wishlist-button";

function dh(value: string | number) {
  return `${Number(value).toLocaleString("fr-FR")} DH`;
}

export function ProductCard({ product }: { product: ProductSummary }) {
  const t = useTranslations("product");
  const locale = useLocale();
  const hasPromo = product.promoPrice !== null;
  const lowStock = product.available > 0 && product.available <= 3;
  const outOfStock = product.available <= 0;

  return (
    <div className="group rounded-2xl border border-border bg-card overflow-hidden transition-shadow hover:shadow-md">
      <Link href={`/produit/${product.seoUrl}`} className="relative block aspect-square bg-brand-primary-soft">
        <div className="absolute left-2 rtl:left-auto rtl:right-2 top-2 flex flex-col gap-1">
          {hasPromo && <Badge variant="cta">{t("promo")}</Badge>}
          {lowStock && <Badge variant="warning">{t("lastUnits")}</Badge>}
          {outOfStock && <Badge variant="outline">{t("outOfStockShort")}</Badge>}
        </div>
        <WishlistButton
          product={product}
          className="absolute right-2 rtl:right-auto rtl:left-2 top-2 flex size-8 items-center justify-center rounded-full bg-card/90 text-muted-foreground shadow-sm hover:text-brand-cta"
        />
        {product.images[0] ? (
          <Image
            src={product.images[0].url}
            alt={localized(product.nameFr, product.nameAr, locale)}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 220px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl">🧸</div>
        )}
      </Link>
      <div className="p-3 flex flex-col gap-1">
        {product.brand && <span className="text-[11px] font-bold uppercase text-muted-foreground">{product.brand.name}</span>}
        <Link href={`/produit/${product.seoUrl}`} className="text-sm font-bold leading-snug line-clamp-2 min-h-[2.5em]">
          {localized(product.nameFr, product.nameAr, locale)}
        </Link>
        <div className="mt-auto flex items-baseline gap-2 pt-1">
          <span className="font-display font-extrabold">{dh(product.promoPrice ?? product.price)}</span>
          {hasPromo && <span className="text-xs text-muted-foreground line-through">{dh(product.price)}</span>}
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-muted-foreground">
            {outOfStock ? t("outOfStockShort") : product.ageMin != null ? `${product.ageMin}-${product.ageMax} ${t("years")}` : ""}
          </span>
          <AddToCartButton productId={product.id} disabled={outOfStock} />
        </div>
      </div>
    </div>
  );
}
