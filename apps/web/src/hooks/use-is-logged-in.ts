"use client";

import { useSyncExternalStore } from "react";
import { isLoggedIn } from "@/lib/auth-client";
import { AUTH_CHANGED_EVENT } from "@/lib/cart-client";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(AUTH_CHANGED_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(AUTH_CHANGED_EVENT, callback);
  };
}

function getServerSnapshot() {
  return null;
}

/** Statut de connexion basé sur localStorage — `null` tant que non vérifié
 * côté client, pour ne jamais brancher le rendu SSR dessus (évite un
 * mismatch d'hydratation). Se met à jour automatiquement au login/logout. */
export function useIsLoggedIn(): boolean | null {
  return useSyncExternalStore(subscribe, isLoggedIn, getServerSnapshot);
}
