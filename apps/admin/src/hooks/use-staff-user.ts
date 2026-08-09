"use client";

import { useSyncExternalStore } from "react";
import { getStaffUser, STAFF_SESSION_CHANGED_EVENT, type StaffUser } from "@/lib/api-client";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(STAFF_SESSION_CHANGED_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(STAFF_SESSION_CHANGED_EVENT, callback);
  };
}

function getServerSnapshot() {
  return null;
}

/** Utilisateur staff connecté (localStorage), `null` si déconnecté.
 * `useSyncExternalStore` résout déjà la vraie valeur client dès la passe de
 * rendu qui suit l'hydratation — pas besoin d'un état "vérification en
 * cours" séparé comme avec `useState` + `useEffect`. Se met à jour
 * automatiquement au login/logout. */
export function useStaffUser(): StaffUser | null {
  return useSyncExternalStore(subscribe, getStaffUser, getServerSnapshot);
}
