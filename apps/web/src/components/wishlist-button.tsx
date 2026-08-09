"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
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

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;
    setPending(true);
    try {
      const result = await toggle(productId);
      if (result === "unauthenticated") router.push("/compte");
    } finally {
      setPending(false);
    }
  }

  return (
    <button onClick={handleClick} disabled={pending} aria-label={t("favorites")} aria-pressed={active} className={className}>
      <Heart className={cn("size-4", active && "fill-brand-cta text-brand-cta")} />
    </button>
  );
}
