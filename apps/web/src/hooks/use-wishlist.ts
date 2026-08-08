"use client";

import { useCallback, useEffect, useState } from "react";
import { isLoggedIn } from "@/lib/auth-client";
import { getWishlist, addToWishlist, removeFromWishlist, type WishlistLine } from "@/lib/wishlist-client";

export const WISHLIST_UPDATED_EVENT = "ue:wishlist-updated";

function broadcastWishlistUpdate() {
  window.dispatchEvent(new Event(WISHLIST_UPDATED_EVENT));
}

export function useWishlist() {
  const [lines, setLines] = useState<WishlistLine[]>([]);
  const [loading, setLoading] = useState(true);
  // null tant que le statut de connexion (basé sur localStorage) n'a pas été
  // vérifié côté client, pour ne jamais brancher le rendu SSR dessus.
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  const refresh = useCallback(async () => {
    if (!isLoggedIn()) {
      setLoggedIn(false);
      setLines([]);
      setLoading(false);
      return;
    }
    setLoggedIn(true);
    try {
      setLines(await getWishlist());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(WISHLIST_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(WISHLIST_UPDATED_EVENT, refresh);
  }, [refresh]);

  const has = useCallback((productId: string) => lines.some((l) => l.productId === productId), [lines]);

  const toggle = useCallback(
    async (productId: string) => {
      if (!isLoggedIn()) return "unauthenticated" as const;
      const inWishlist = lines.some((l) => l.productId === productId);
      setLines(inWishlist ? await removeFromWishlist(productId) : await addToWishlist(productId));
      broadcastWishlistUpdate();
      return "ok" as const;
    },
    [lines],
  );

  return { lines, loading, loggedIn, has, toggle, refresh };
}
