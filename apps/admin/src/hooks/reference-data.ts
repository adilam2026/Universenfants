"use client";

import useSWR, { preload } from "swr";
import { listCategories, listBrands, type AdminCategory, type AdminBrand } from "@/lib/catalog";
import { listCities, listCityGroups, type AdminCity, type AdminCityGroup } from "@/lib/cities";
import { getSettings, type AdminSettings } from "@/lib/settings";
import { listPermissionOptions, listRoles, type PermissionOption, type AdminRole } from "@/lib/staff-users";
import type { StaffUser } from "@/lib/api-client";

// Référentiels : peu de lignes, peu de changements, réutilisés dans de
// nombreux écrans/formulaires (produits, promotions, livraison...). Une
// fraîcheur de 5 min évite un aller-retour réseau à chaque ouverture d'un
// formulaire qui en a besoin, tout en restant à jour dans la même session de
// travail. `revalidateIfStale: false` + `revalidateOnFocus: false` : une
// fois chargée, la donnée ne se re-fetch pas juste parce qu'on revient sur
// l'onglet — seul un `mutate()` explicite après une mutation la met à jour.
const REFERENCE_OPTIONS = {
  dedupingInterval: 5 * 60_000,
  revalidateOnFocus: false,
  revalidateIfStale: false,
} as const;

export const REFERENCE_KEYS = {
  categories: "/categories",
  brands: "/brands",
  cities: "/cities",
  cityGroups: "/city-groups",
  settings: "/settings",
  permissionOptions: "/roles/permissions",
  roles: "/roles",
} as const;

export function useCategories() {
  return useSWR<AdminCategory[]>(REFERENCE_KEYS.categories, listCategories, REFERENCE_OPTIONS);
}

export function useBrands() {
  return useSWR<AdminBrand[]>(REFERENCE_KEYS.brands, listBrands, REFERENCE_OPTIONS);
}

export function useCities() {
  return useSWR<AdminCity[]>(REFERENCE_KEYS.cities, listCities, REFERENCE_OPTIONS);
}

export function useCityGroups() {
  return useSWR<AdminCityGroup[]>(REFERENCE_KEYS.cityGroups, listCityGroups, REFERENCE_OPTIONS);
}

export function useAdminSettings() {
  return useSWR<AdminSettings>(REFERENCE_KEYS.settings, getSettings, REFERENCE_OPTIONS);
}

export function usePermissionOptions() {
  return useSWR<PermissionOption[]>(REFERENCE_KEYS.permissionOptions, listPermissionOptions, REFERENCE_OPTIONS);
}

export function useRoles() {
  return useSWR<AdminRole[]>(REFERENCE_KEYS.roles, listRoles, REFERENCE_OPTIONS);
}

/** Référentiels communs à précharger juste après authentification, filtrés
 * par permission (`user.manage` pour rôles/permissions) pour ne jamais
 * déclencher d'appel voué à un 403 chez un membre du staff qui n'a pas ce
 * droit. Le simple appel `preload(key, fetcher)` de SWR alimente le cache
 * global : le premier `useSWR(key, ...)` monté ensuite (n'importe où dans
 * l'app) réutilise immédiatement le résultat au lieu de re-fetcher. */
export function preloadReferenceData(user: StaffUser) {
  const perms = user.permissions ?? [];
  if (perms.includes("product.read")) {
    preload(REFERENCE_KEYS.categories, listCategories);
    preload(REFERENCE_KEYS.brands, listBrands);
  }
  if (perms.includes("shipping.read")) {
    preload(REFERENCE_KEYS.cities, listCities);
    preload(REFERENCE_KEYS.cityGroups, listCityGroups);
  }
  // Paramètres globaux (TVA, seuil livraison gratuite, taux de conversion
  // fidélité) : lecture libre côté API (pas de garde de permission), utile
  // dans plusieurs formulaires (promotions, produits) au-delà du seul écran
  // Paramètres.
  preload(REFERENCE_KEYS.settings, getSettings);
  if (perms.includes("user.manage")) {
    preload(REFERENCE_KEYS.permissionOptions, listPermissionOptions);
    preload(REFERENCE_KEYS.roles, listRoles);
  }
}
