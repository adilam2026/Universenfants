"use client";

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

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const result = await toggle(productId);
    if (result === "unauthenticated") router.push("/compte");
  }

  return (
    <button onClick={handleClick} aria-label={t("favorites")} aria-pressed={active} className={className}>
      <Heart className={cn("size-4", active && "fill-brand-cta text-brand-cta")} />
    </button>
  );
}
