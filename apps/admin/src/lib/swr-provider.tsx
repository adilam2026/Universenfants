"use client";

import { SWRConfig } from "swr";
import { apiFetch, ApiError } from "./api-client";

// Fetcher générique partagé par tout `useSWR(url)` qui ne passe pas son
// propre fetcher — la clé SWR est directement le chemin d'API (ex:
// "/categories", "/orders/admin/list?status=PENDING"), donc un seul fetcher
// générique suffit pour la quasi-totalité des hooks.
const fetcher = <T,>(path: string) => apiFetch<T>(path);

// Une 401/403/404 ne se corrige jamais en réessayant (droit manquant ou
// ressource inexistante) — sans cette exception, le retry par défaut de SWR
// (backoff exponentiel, jusqu'à 5 tentatives) martèle inutilement l'API sur
// des erreurs permanentes.
function shouldRetryOnError(error: unknown) {
  if (error instanceof ApiError && [401, 403, 404].includes(error.status)) return false;
  return true;
}

/** Stratégie de cache par défaut du Back-Office : une donnée déjà en cache
 * s'affiche immédiatement (`keepPreviousData`) pendant qu'une revalidation
 * silencieuse tourne en arrière-plan. Le focus/reconnexion redéclenchent une
 * revalidation (donnée jamais périmée trop longtemps) mais `dedupingInterval`
 * empêche deux composants montés à quelques secondes d'intervalle de refaire
 * le même appel réseau. Les hooks de référentiels (catégories, marques...)
 * surchargent ces valeurs avec une fraîcheur plus longue — voir
 * reference-data.ts.
 */
export function SwrProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        keepPreviousData: true,
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        revalidateIfStale: true,
        dedupingInterval: 15_000,
        errorRetryCount: 2,
        shouldRetryOnError,
      }}
    >
      {children}
    </SWRConfig>
  );
}
