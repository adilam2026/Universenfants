"use client";

import { useCallback, useEffect, useState } from "react";
import { useIsLoggedIn } from "@/hooks/use-is-logged-in";
import { getWishlist, addToWishlist, removeFromWishlist, type WishlistLine } from "@/lib/wishlist-client";
import { getGuestWishlist, addToGuestWishlist, removeFromGuestWishlist, clearGuestWishlist } from "@/lib/guest-wishlist";
import { isLoggedIn } from "@/lib/auth-client";
import { WISHLIST_UPDATED_EVENT } from "@/lib/wishlist-events";

export { WISHLIST_UPDATED_EVENT };

function broadcastWishlistUpdate() {
  window.dispatchEvent(new Event(WISHLIST_UPDATED_EVENT));
}

// useWishlist() est monté une fois par bouton cœur affiché à l'écran (une
// carte produit = une instance) : sans ce verrou tenant sur le module plutôt
// que sur chaque instance, un login sur une page à 6 produits déclenchait
// bien 6 fusions indépendantes en parallèle, donc 6 requêtes POST identiques
// vers le même produit (constaté en conditions réelles : 6 requêtes pour un
// seul article favori invité).
let guestMergeInFlight = false;

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
  // `guestMergeInFlight` + vider le stockage local de façon SYNCHRONE (avant
  // le moindre `await`) sont ce qui empêche plusieurs instances montées en
  // même temps de fusionner chacune leur côté : React exécute les effets de
  // tous les composants d'un même commit les uns après les autres sans
  // repasser la main entre-temps, donc la première instance à s'exécuter
  // voit la liste et la vide immédiatement — toutes les suivantes, dans ce
  // même commit, la trouvent déjà vide et n'ont plus rien à fusionner.
  useEffect(() => {
    if (loggedIn !== true || guestMergeInFlight) return;
    const guestLines = getGuestWishlist();
    if (guestLines.length === 0) {
      refresh();
      return;
    }
    guestMergeInFlight = true;
    clearGuestWishlist();
    (async () => {
      for (const line of guestLines) {
        await addToWishlist(line.productId).catch(() => {});
      }
      await refresh();
    })();
  }, [loggedIn, refresh]);

  useEffect(() => {
    if (loggedIn === false) {
      // Réarme la fusion : un invité peut se déconnecter puis refavoriser
      // d'autres produits avant de se reconnecter plus tard dans la même page.
      guestMergeInFlight = false;
      refresh();
    }
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
