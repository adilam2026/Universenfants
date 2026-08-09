"use client";

import { useCallback, useEffect, useState } from "react";
import { useIsLoggedIn } from "@/hooks/use-is-logged-in";
import { getWishlist, addToWishlist, removeFromWishlist, type WishlistLine } from "@/lib/wishlist-client";
import { isLoggedIn } from "@/lib/auth-client";

export const WISHLIST_UPDATED_EVENT = "ue:wishlist-updated";

function broadcastWishlistUpdate() {
  window.dispatchEvent(new Event(WISHLIST_UPDATED_EVENT));
}

export function useWishlist() {
  const loggedIn = useIsLoggedIn();
  const [lines, setLines] = useState<WishlistLine[]>([]);
  // Ne redevient jamais true après le chargement initial — un rafraîchissement
  // suite à un toggle n'a pas besoin de réafficher un état de chargement.
  const [fetched, setFetched] = useState(false);

  const refresh = useCallback(async () => {
    if (!isLoggedIn()) return;
    try {
      setLines(await getWishlist());
    } finally {
      setFetched(true);
    }
  }, []);

  useEffect(() => {
    if (loggedIn === true) refresh();
  }, [loggedIn, refresh]);

  useEffect(() => {
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

  const loading = loggedIn === null || (loggedIn === true && !fetched);
  return { lines, loading, loggedIn, has, toggle, refresh };
}
