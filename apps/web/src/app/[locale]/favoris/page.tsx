"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import Image from "next/image";
import { Heart, Trash2, Share2 } from "lucide-react";
import { useWishlist } from "@/hooks/use-wishlist";
import { localized } from "@/lib/localized";
import { shareWishlist } from "@/lib/wishlist-client";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

function dh(value: number) {
  return `${value.toLocaleString("fr-FR")} DH`;
}

export default function WishlistPage() {
  const t = useTranslations("wishlist");
  const locale = useLocale();
  const { lines, loading, loggedIn, toggle } = useWishlist();
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const { shareToken } = await shareWishlist();
    const url = `${window.location.origin}/${locale}/favoris/${shareToken}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading || loggedIn === null) {
    return <div className="mx-auto max-w-6xl px-4 py-16 text-center text-muted-foreground">…</div>;
  }

  if (!loggedIn) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <Heart className="mx-auto size-10 mb-3 text-muted-foreground opacity-40" />
        <p className="text-muted-foreground mb-4">{t("loginRequired")}</p>
        <Button asChild>
          <Link href="/compte">{t("title")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-7 py-4">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-5">
        <h1 className="font-display text-2xl font-extrabold">{t("title")}</h1>
        {lines.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="size-4" /> {copied ? t("shareCopied") : t("share")}
          </Button>
        )}
      </div>

      {lines.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <Heart className="mx-auto size-10 mb-3 opacity-40" />
          <p className="mb-4">{t("empty")}</p>
          <Button asChild>
            <Link href="/">{t("browseCatalog")}</Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-border divide-y divide-border overflow-hidden bg-card">
          {lines.map((line) => (
            <div key={line.productId} className="flex gap-3 p-3.5 items-center">
              <div className="relative size-16 shrink-0 rounded-xl bg-brand-primary-soft flex items-center justify-center text-2xl overflow-hidden">
                {line.image ? <Image src={line.image} alt="" fill sizes="64px" className="object-cover" /> : "🧸"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{localized(line.name, line.nameAr, locale)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{dh(line.price)}</p>
                {!line.available && <p className="text-xs text-destructive mt-0.5">{t("unavailable")}</p>}
              </div>
              <AddToCartButton productId={line.productId} disabled={!line.available} />
              <button
                onClick={() => toggle(line.productId)}
                className="text-xs font-bold text-muted-foreground hover:text-destructive flex items-center gap-1 shrink-0"
              >
                <Trash2 className="size-3.5" /> {t("remove")}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
