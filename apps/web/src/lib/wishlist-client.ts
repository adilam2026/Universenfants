"use client";

import { getCustomerToken } from "@/lib/cart-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
const FETCH_TIMEOUT_MS = 10_000;

export interface WishlistLine {
  productId: string;
  addedAt: string;
  name: string;
  nameAr: string | null;
  price: number;
  image: string | null;
  available: boolean;
}

async function wishlistFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getCustomerToken();
  if (!token) throw new Error("NOT_AUTHENTICATED");
  const res = await fetch(`${API_URL}/wishlist${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init?.headers },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = Array.isArray(body.message) ? body.message.join(" — ") : body.message;
    throw new Error(message ?? `Erreur (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export function getWishlist() {
  return wishlistFetch<WishlistLine[]>("");
}

export function addToWishlist(productId: string) {
  return wishlistFetch<WishlistLine[]>("", { method: "POST", body: JSON.stringify({ productId }) });
}

export function removeFromWishlist(productId: string) {
  return wishlistFetch<WishlistLine[]>(`/${productId}`, { method: "DELETE" });
}

export function shareWishlist() {
  return wishlistFetch<{ shareToken: string }>("/share", { method: "POST" });
}

export interface SharedWishlistLine {
  productId: string;
  name: string;
  nameAr: string | null;
  seoUrl: string;
  price: number;
  image: string | null;
  available: boolean;
}

export async function getSharedWishlist(shareToken: string) {
  const res = await fetch(`${API_URL}/wishlist/shared/${shareToken}`, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) throw new Error(res.status === 404 ? "NOT_FOUND" : `Erreur (${res.status})`);
  return res.json() as Promise<SharedWishlistLine[]>;
}
