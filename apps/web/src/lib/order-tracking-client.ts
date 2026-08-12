import type { OrderDetail } from "./auth-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
const FETCH_TIMEOUT_MS = 15_000;
// sessionStorage (pas localStorage) : une session de suivi invité est
// volontairement courte (30 min côté API) et n'a pas vocation à survivre
// à la fermeture de l'onglet, contrairement à la session client authentifiée.
const GUEST_TOKEN_KEY = "ue_guest_tracking_token";

export function getGuestTrackingToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(GUEST_TOKEN_KEY);
}

function setGuestTrackingToken(token: string) {
  window.sessionStorage.setItem(GUEST_TOKEN_KEY, token);
}

export function clearGuestTrackingToken() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(GUEST_TOKEN_KEY);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = Array.isArray(body.message) ? body.message.join(" — ") : body.message;
    throw new Error(message ?? `Erreur (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export function requestTrackingOtp(orderNumber: string) {
  return request<{ ok: true; maskedPhone: string | null }>("/orders/track/request-otp", {
    method: "POST",
    body: JSON.stringify({ orderNumber }),
  });
}

export async function verifyTrackingOtp(orderNumber: string, code: string) {
  const { token } = await request<{ token: string }>("/orders/track/verify-otp", {
    method: "POST",
    body: JSON.stringify({ orderNumber, code }),
  });
  setGuestTrackingToken(token);
  return token;
}

export function getTrackedOrder() {
  const token = getGuestTrackingToken();
  if (!token) return Promise.reject(new Error("Session de suivi manquante"));
  return request<OrderDetail>("/orders/track/me", { headers: { Authorization: `Bearer ${token}` } });
}
