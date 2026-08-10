"use client";

import { preload } from "swr";
import { listAdminOrders, orderListKey } from "./orders";
import { listAdminProducts, productListKey, getStockValuation } from "./products";
import { listCustomers, customerListKey } from "./customers";
import { listPromotions } from "./promotions";
import { getAnalyticsSummary } from "./analytics";
import { LIST_PAGE_SIZE } from "./list-defaults";
import type { StaffUser } from "./api-client";

// Sections les plus consultées après le Dashboard — un enchaînement typique
// de journée de travail. Volontairement limité (première page, filtres par
// défaut) : le but est d'éviter le "Chargement…" au premier clic, pas de
// rapatrier des milliers de lignes en tâche de fond.
const ROUTES_TO_PREFETCH = ["/produits", "/commandes", "/clients", "/stock", "/promotions", "/analytics"];

function runOnIdle(fn: () => void) {
  const w = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
  if (w.requestIdleCallback) {
    w.requestIdleCallback(fn, { timeout: 3000 });
  } else {
    window.setTimeout(fn, 300);
  }
}

/** Appelé une fois, après l'affichage du Dashboard : profite du temps mort
 * du navigateur pour précharger les données de la 1re page des rubriques les
 * plus probables (mêmes clés SWR que les hooks des pages elles-mêmes, donc
 * `preload` alimente exactement le cache qu'elles liront) et pour demander à
 * Next.js de préparer le code des routes correspondantes. */
export function prefetchSecondaryData(user: StaffUser, router: { prefetch: (href: string) => void }) {
  const perms = user.permissions ?? [];

  runOnIdle(() => {
    // Filtres identiques à l'état initial des pages liste (page 1, taille par
    // défaut, pas de filtre) — indispensable pour que la clé SWR précalculée
    // ici soit strictement la même que celle que la page recalculera à son
    // montage, sinon `preload` alimente une entrée de cache que personne ne lit.
    const listFilters = { page: 1, limit: LIST_PAGE_SIZE };
    if (perms.includes("order.read")) preload(orderListKey(listFilters), () => listAdminOrders(listFilters));
    if (perms.includes("product.read")) {
      preload(productListKey(listFilters), () => listAdminProducts(listFilters));
      preload("/products/admin/stock-valuation", getStockValuation);
    }
    if (perms.includes("customer.read")) preload(customerListKey(listFilters), () => listCustomers(listFilters));
    if (perms.includes("promotion.create")) preload("/promotions", listPromotions);
    if (perms.includes("analytics.read")) preload("/analytics/summary?days=30", () => getAnalyticsSummary(30));

    for (const route of ROUTES_TO_PREFETCH) {
      router.prefetch(route);
    }
  });
}
