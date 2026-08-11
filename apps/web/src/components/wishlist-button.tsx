"use client";

import { useState } from "react";
import { Heart, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useWishlist } from "@/hooks/use-wishlist";
import { cn } from "@/lib/utils";

export interface WishlistButtonProduct {
  id: string;
  nameFr: string;
  nameAr: string | null;
  price: string;
  promoPrice: string | null;
  seoUrl?: string;
  available: number;
  images: { url: string }[];
}

export function WishlistButton({ product, className }: { product: WishlistButtonProduct; className?: string }) {
  const t = useTranslations("product");
  const { has, toggle } = useWishlist();
  const active = has(product.id);
  // Un double-clic rapide sur le cœur reste sans danger côté serveur (upsert
  // atomique), mais désactiver le bouton pendant la requête en cours évite
  // d'enchaîner deux ajouts/retraits en sens inverse pour un simple double-clic.
  const [pending, setPending] = useState(false);
  // Sans état d'erreur visible, un échec réseau laissait le cœur revenir
  // silencieusement à son état d'avant clic — le client ne pouvait pas savoir
  // que rien ne s'était passé.
  const [error, setError] = useState(false);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;
    setPending(true);
    setError(false);
    try {
      // Snapshot utilisé uniquement pour les favoris invité (localStorage) —
      // ignoré côté serveur pour un compte connecté, qui a déjà ces données.
      await toggle(product.id, {
        name: product.nameFr,
        nameAr: product.nameAr,
        price: Number(product.promoPrice ?? product.price),
        image: product.images[0]?.url ?? null,
        available: product.available > 0,
      });
    } catch {
      setError(true);
      setTimeout(() => setError(false), 2500);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      aria-label={error ? t("addToCartError") : t("favorites")}
      aria-pressed={active}
      title={error ? t("addToCartError") : undefined}
      className={className}
    >
      {error ? <AlertCircle className="size-4 text-destructive" /> : <Heart className={cn("size-4", active && "fill-brand-cta text-brand-cta")} />}
    </button>
  );
}
