"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { Heart } from "lucide-react";
import { getSharedWishlist, type SharedWishlistLine } from "@/lib/wishlist-client";
import { localized } from "@/lib/localized";
import { AddToCartButton } from "@/components/add-to-cart-button";

function dh(value: number) {
  return `${value.toLocaleString("fr-FR")} DH`;
}

export default function SharedWishlistPage({ params }: { params: Promise<{ locale: string; shareToken: string }> }) {
  const { shareToken } = use(params);
  const t = useTranslations("wishlist");
  const locale = useLocale();
  const [lines, setLines] = useState<SharedWishlistLine[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSharedWishlist(shareToken)
      .then(setLines)
      .catch(() => setError(t("sharedNotFound")));
  }, [shareToken, t]);

  if (error) return <div className="mx-auto max-w-md px-4 py-16 text-center text-muted-foreground">{error}</div>;
  if (!lines) return <div className="mx-auto max-w-2xl px-4 py-16 text-center text-muted-foreground">{t("loading")}</div>;

  return (
    <div className="mx-auto max-w-2xl px-4 md:px-7 py-8">
      <div className="text-center mb-6">
        <Heart className="mx-auto size-10 text-primary mb-2" />
        <h1 className="font-display text-2xl font-extrabold">{t("sharedTitle")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("sharedSubtitle")}</p>
      </div>

      <div className="flex flex-col gap-2.5">
        {lines.map((line) => (
          <div key={line.productId} className="rounded-2xl border border-border bg-card p-3.5 flex items-center gap-3">
            <div className="relative size-14 shrink-0 rounded-xl bg-brand-primary-soft flex items-center justify-center text-2xl overflow-hidden">
              {line.image ? <Image src={line.image} alt="" fill sizes="56px" className="object-cover" /> : "🧸"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{localized(line.name, line.nameAr, locale)}</p>
              <p className="text-xs text-muted-foreground">{dh(line.price)}</p>
            </div>
            <AddToCartButton productId={line.productId} disabled={!line.available} />
          </div>
        ))}
        {lines.length === 0 && <p className="text-sm text-muted-foreground py-10 text-center">{t("sharedEmpty")}</p>}
      </div>
    </div>
  );
}
