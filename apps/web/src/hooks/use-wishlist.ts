"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useIsLoggedIn } from "@/hooks/use-is-logged-in";
import { getWishlist, addToWishlist, removeFromWishlist, type WishlistLine } from "@/lib/wishlist-client";
import { getGuestWishlist, addToGuestWishlist, removeFromGuestWishlist, clearGuestWishlist } from "@/lib/guest-wishlist";
import { isLoggedIn } from "@/lib/auth-client";
import { WISHLIST_UPDATED_EVENT } from "@/lib/wishlist-events";

export { WISHLIST_UPDATED_EVENT };

function broadcastWishlistUpdate() {
  window.dispatchEvent(new Event(WISHLIST_UPDATED_EVENT));
}

/**
 * Favoris invité (localStorage) + favoris compte (serveur) derrière la même
 * API — un visiteur peut mettre en favoris sans jamais voir d'écran de
 * connexion. À la connexion/inscription, les favoris locaux sont fusionnés
 * une fois dans le compte puis effacés du stockage local.
 */
export function useWishlist() {
  const loggedIn = useIsLoggedIn();
  const [lines, setLines] = useState<WishlistLine[]>([]);
  // Ne redevient jamais true après le chargement initial — un rafraîchissement
  // suite à un toggle n'a pas besoin de réafficher un état de chargement.
  const [fetched, setFetched] = useState(false);
  const mergedRef = useRef(false);

  const refresh = useCallback(async () => {
    if (isLoggedIn()) {
      try {
        setLines(await getWishlist());
      } finally {
        setFetched(true);
      }
    } else {
      setLines(getGuestWishlist());
      setFetched(true);
    }
  }, []);

  // Fusion unique des favoris invités dans le compte fraîchement connecté.
  useEffect(() => {
    if (loggedIn !== true || mergedRef.current) return;
    mergedRef.current = true;
    const guestLines = getGuestWishlist();
    if (guestLines.length === 0) {
      refresh();
      return;
    }
    (async () => {
      for (const line of guestLines) {
        await addToWishlist(line.productId).catch(() => {});
      }
      clearGuestWishlist();
      await refresh();
    })();
  }, [loggedIn, refresh]);

  useEffect(() => {
    if (loggedIn === false) refresh();
  }, [loggedIn, refresh]);

  useEffect(() => {
    window.addEventListener(WISHLIST_UPDATED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(WISHLIST_UPDATED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  const has = useCallback((productId: string) => lines.some((l) => l.productId === productId), [lines]);

  const toggle = useCallback(
    async (productId: string, snapshot?: Omit<WishlistLine, "productId" | "addedAt">) => {
      const inWishlist = lines.some((l) => l.productId === productId);
      if (isLoggedIn()) {
        setLines(inWishlist ? await removeFromWishlist(productId) : await addToWishlist(productId));
      } else if (inWishlist) {
        setLines(removeFromGuestWishlist(productId));
      } else if (snapshot) {
        setLines(addToGuestWishlist({ productId, addedAt: new Date().toISOString(), ...snapshot }));
      } else {
        return "missing_snapshot" as const;
      }
      broadcastWishlistUpdate();
      return "ok" as const;
    },
    [lines],
  );

  const loading = loggedIn === null || !fetched;
  return { lines, loading, loggedIn, has, toggle, refresh };
}
