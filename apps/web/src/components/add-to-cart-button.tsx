"use client";

import { useState } from "react";
import { PackagePlus, Check, Loader2 } from "lucide-react";
import { addToCart } from "@/lib/cart-client";
import { broadcastCartUpdate } from "@/hooks/use-cart";
import { cn } from "@/lib/utils";

export function AddToCartButton({ productId, disabled, className }: { productId: string; disabled?: boolean; className?: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");

  async function handleClick() {
    if (disabled || state === "loading") return;
    setState("loading");
    try {
      await addToCart(productId, 1);
      broadcastCartUpdate();
      setState("done");
      setTimeout(() => setState("idle"), 1200);
    } catch {
      setState("idle");
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        "flex size-8 items-center justify-center rounded-full bg-brand-cta text-brand-cta-foreground disabled:opacity-40",
        className,
      )}
      aria-label="Ajouter au panier"
    >
      {state === "loading" ? (
        <Loader2 className="size-4 animate-spin" />
      ) : state === "done" ? (
        <Check className="size-4" />
      ) : (
        <PackagePlus className="size-4" />
      )}
    </button>
  );
}
