"use client";

import { getCustomerToken } from "@/lib/cart-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
const FETCH_TIMEOUT_MS = 10_000;

async function reviewsFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getCustomerToken();
  if (!token) throw new Error("NOT_AUTHENTICATED");
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init?.headers },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Erreur (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export interface ReviewEligibility {
  canReview: boolean;
  alreadyReviewed: boolean;
}

export function getReviewEligibility(productId: string) {
  return reviewsFetch<ReviewEligibility>(`/reviews/eligibility/${productId}`);
}

export function submitReview(productId: string, rating: number, comment: string) {
  return reviewsFetch(`/reviews`, {
    method: "POST",
    body: JSON.stringify({ productId, rating, comment: comment || undefined }),
  });
}
