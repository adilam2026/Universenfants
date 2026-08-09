"use client";

import { useEffect, useState } from "react";
import { getPublicSettings, getDeliveryCities, type PublicSettings, type DeliveryCity } from "@/lib/settings-client";

export interface StoreSettings {
  settings: PublicSettings;
  cities: DeliveryCity[];
}

// Module-level cache : ces valeurs (TVA, taux fidélité, villes livrables)
// changent rarement — un seul appel réseau pour toute la session au lieu de
// le refaire à chaque montage de composant (panier, checkout, compte).
let cache: StoreSettings | null = null;
let inFlight: Promise<StoreSettings> | null = null;

async function loadStoreSettings(): Promise<StoreSettings> {
  if (cache) return cache;
  if (!inFlight) {
    inFlight = Promise.all([getPublicSettings(), getDeliveryCities()])
      .then(([settings, cities]) => {
        cache = { settings, cities };
        return cache;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

/** null tant que non chargé — les appelants doivent prévoir un repli
 * raisonnable (ex. ne pas afficher un taux de TVA avant d'avoir la vraie
 * valeur) plutôt qu'une constante codée en dur qui pourrait diverger. */
export function useStoreSettings(): StoreSettings | null {
  const [data, setData] = useState<StoreSettings | null>(cache);

  useEffect(() => {
    // Déjà capturé par l'état initial de useState ci-dessus si le cache
    // était déjà rempli au montage — inutile de le re-poser ici.
    if (cache) return;
    let cancelled = false;
    loadStoreSettings()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}
