"use client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
const FETCH_TIMEOUT_MS = 10_000;

export interface PublicSettings {
  vatRate: number;
  loyaltyRedeemRate: number;
  freeShippingThreshold: number;
}

export interface DeliveryCity {
  name: string;
  shippingFee: number;
  freeShippingFrom: number;
}

async function publicFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`Erreur (${res.status})`);
  return res.json() as Promise<T>;
}

/** Réglages non sensibles (TVA, taux de conversion fidélité, seuil de
 * livraison offerte) — sans authentification, pour ne pas afficher des
 * valeurs codées en dur qui divergent dès qu'un admin change un réglage. */
export const getPublicSettings = () => publicFetch<PublicSettings>("/settings");

/** Villes réellement livrables, avec leurs frais de port réels. */
export const getDeliveryCities = () => publicFetch<DeliveryCity[]>("/cities/public");
