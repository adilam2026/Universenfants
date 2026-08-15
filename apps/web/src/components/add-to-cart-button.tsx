"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PackagePlus, Check, Loader2, AlertCircle } from "lucide-react";
import { addToCart } from "@/lib/cart-client";
import { broadcastCartUpdate } from "@/hooks/use-cart";
import { cn } from "@/lib/utils";

export function AddToCartButton({
  productId,
  variantId,
  quantity = 1,
  disabled,
  className,
  children,
  onAdded,
}: {
  productId: string;
  variantId?: string;
  quantity?: number;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
  onAdded?: () => void;
}) {
  const t = useTranslations("product");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleClick() {
    if (disabled || state === "loading") return;
    setState("loading");
    try {
      await addToCart(productId, quantity, variantId);
      broadcastCartUpdate();
      setState("done");
      onAdded?.();
      setTimeout(() => setState("idle"), 1200);
    } catch {
      // Sans ceci, un échec (rupture de stock détectée côté serveur, réseau)
      // faisait juste revenir le bouton à son icône de départ — invisible
      // pour le client, qui ne pouvait pas savoir que rien n'avait été ajouté.
      setState("error");
      setTimeout(() => setState("idle"), 2500);
    }
  }

  if (children) {
    return (
      <button
        onClick={handleClick}
        disabled={disabled}
        title={state === "error" ? t("addToCartError") : undefined}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-full bg-brand-cta text-brand-cta-foreground disabled:opacity-40",
          state === "error" && "bg-destructive text-destructive-foreground",
          className,
        )}
      >
        {state === "loading" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : state === "done" ? (
          <Check className="size-4" />
        ) : state === "error" ? (
          <AlertCircle className="size-4" />
        ) : null}
        {state === "done" ? t("addedToCart") : state === "error" ? t("addToCartError") : children}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        // size-9 plutôt que size-8 : icône seule utilisée uniquement sur
        // mobile désormais (variante desktop = bouton texte au survol, voir
        // ProductCard) — cible tactile un peu plus généreuse.
        "flex size-9 items-center justify-center rounded-full bg-brand-cta text-brand-cta-foreground disabled:opacity-40",
        state === "error" && "bg-destructive text-destructive-foreground",
        className,
      )}
      aria-label={state === "error" ? t("addToCartError") : state === "done" ? t("addedToCart") : t("addToCart")}
      title={state === "error" ? t("addToCartError") : undefined}
    >
      {state === "loading" ? (
        <Loader2 className="size-4 animate-spin" />
      ) : state === "done" ? (
        <Check className="size-4" />
      ) : state === "error" ? (
        <AlertCircle className="size-4" />
      ) : (
        <PackagePlus className="size-[18px]" />
      )}
    </button>
  );
}
