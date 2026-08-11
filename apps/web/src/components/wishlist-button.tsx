"use client";

import { useState } from "react";
import { Heart, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useWishlist } from "@/hooks/use-wishlist";
import { cn } from "@/lib/utils";

export function WishlistButton({ productId, className }: { productId: string; className?: string }) {
  const t = useTranslations("product");
  const router = useRouter();
  const { has, toggle } = useWishlist();
  const active = has(productId);
  // Un double-clic rapide sur le cœur reste sans danger côté serveur (upsert
  // atomique), mais désactiver le bouton pendant la requête en cours évite
  // d'enchaîner deux ajouts/retraits en sens inverse pour un simple double-clic.
  const [pending, setPending] = useState(false);
  // Sans état d'erreur visible, un échec réseau laissait le cœur revenir
  // silencieusement à son état d'avant clic — le client ne pouvait pas savoir
  // que rien ne s'était passé (toggle() peut rejeter, pas seulement retourner
  // "unauthenticated").
  const [error, setError] = useState(false);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;
    setPending(true);
    setError(false);
    try {
      const result = await toggle(productId);
      if (result === "unauthenticated") router.push("/compte");
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
