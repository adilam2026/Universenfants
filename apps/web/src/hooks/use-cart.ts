"use client";

import { useCallback, useEffect, useState } from "react";
import { getCart, type CartData } from "@/lib/cart-client";

/** Événement custom pour que le badge du header se resynchronise après une mutation ailleurs sur la page. */
export const CART_UPDATED_EVENT = "ue:cart-updated";

export function broadcastCartUpdate() {
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}

export function useCart(shareToken?: string) {
  const [cart, setCart] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await getCart(shareToken);
      setCart(data);
    } finally {
      setLoading(false);
    }
  }, [shareToken]);

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener(CART_UPDATED_EVENT, handler);
    return () => window.removeEventListener(CART_UPDATED_EVENT, handler);
  }, [refresh]);

  return { cart, loading, refresh };
}

export function useCartCount() {
  const { cart } = useCart();
  return cart?.lines.reduce((s, l) => s + l.quantity, 0) ?? 0;
}
