"use client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
const TOKEN_KEY = "ue_cart_token";
const AUTH_KEY = "ue_customer_token";
const REFRESH_KEY = "ue_customer_refresh_token";
const FETCH_TIMEOUT_MS = 10_000;

export const AUTH_CHANGED_EVENT = "ue:auth-changed";

export function getCartToken(): string {
  if (typeof window === "undefined") return "";
  let token = window.localStorage.getItem(TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    window.localStorage.setItem(TOKEN_KEY, token);
  }
  return token;
}

export function getCustomerToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AUTH_KEY);
}

export function getCustomerRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_KEY);
}

export function setCustomerToken(token: string, refreshToken?: string) {
  window.localStorage.setItem(AUTH_KEY, token);
  if (refreshToken) window.localStorage.setItem(REFRESH_KEY, refreshToken);
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function clearCustomerToken() {
  window.localStorage.removeItem(AUTH_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

// L'access token expire au bout de 15 min (JWT_ACCESS_EXPIRES_IN) — sans ce
// mécanisme, toute session client se termine brutalement après 15 min
// d'inactivité de requête, même avec un refresh token valide 30 jours.
// dédupliqué : plusieurs requêtes en 401 simultanées ne déclenchent qu'un
// seul appel /refresh.
let refreshInFlight: Promise<string | null> | null = null;

export function refreshCustomerAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  const refreshToken = getCustomerRefreshToken();
  if (!refreshToken) return Promise.resolve(null);

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/customer/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) {
        clearCustomerToken();
        return null;
      }
      const data = (await res.json()) as { accessToken: string; refreshToken: string };
      setCustomerToken(data.accessToken, data.refreshToken);
      return data.accessToken;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

function decodeJwtExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

/** Rafraîchit *avant* d'envoyer un token expiré plutôt que de réagir à un
 * 401 : les routes accessibles en invité (panier, checkout) utilisent
 * OptionalJwtAuthGuard côté API, qui n'échoue jamais sur un token invalide —
 * il traite juste silencieusement la requête comme anonyme. Sans ce
 * mécanisme, un client connecté dont le token a expiré verrait sa commande
 * traitée en invité, sans lien avec son compte, sans aucune erreur visible. */
export async function getValidCustomerToken(): Promise<string | null> {
  const token = getCustomerToken();
  if (!token) return null;
  const expiresAt = decodeJwtExpiry(token);
  const expiringSoon = expiresAt !== null && Date.now() >= expiresAt - 30_000;
  if (expiringSoon) return refreshCustomerAccessToken();
  return token;
}

export interface CartLine {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  name: string;
  image: string | null;
  unitPrice: number;
  variantLabel: string | null;
}

export interface CartData {
  id: string;
  shareToken: string | null;
  participants: { email: string }[];
  lines: CartLine[];
  couponCode: string | null;
  subtotal: number;
  discount: number;
  total: number;
}

async function cartFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-cart-token": getCartToken(),
    ...(init?.headers as Record<string, string>),
  };
  const customerToken = await getValidCustomerToken();
  if (customerToken) headers.Authorization = `Bearer ${customerToken}`;

  const res = await fetch(`${API_URL}${path}`, { ...init, headers, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  const returnedToken = res.headers.get("x-cart-token");
  if (returnedToken) window.localStorage.setItem(TOKEN_KEY, returnedToken);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Erreur (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const getCart = () => cartFetch<CartData>("/cart");
export const addToCart = (productId: string, quantity = 1, variantId?: string) =>
  cartFetch<CartData>("/cart/lines", { method: "POST", body: JSON.stringify({ productId, quantity, variantId }) });
export const updateCartLine = (lineId: string, quantity: number) =>
  cartFetch<CartData>(`/cart/lines/${lineId}`, { method: "PATCH", body: JSON.stringify({ quantity }) });
export const removeCartLine = (lineId: string) => cartFetch<CartData>(`/cart/lines/${lineId}`, { method: "DELETE" });
export const applyCoupon = (code: string) => cartFetch<CartData>("/cart/coupon", { method: "POST", body: JSON.stringify({ code }) });
export const removeCoupon = () => cartFetch<CartData>("/cart/coupon", { method: "DELETE" });
export const shareCart = () => cartFetch<{ shareToken: string }>("/cart/share", { method: "POST" });

export interface CheckoutPayload {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  city: string;
  addressLine: string;
  comment?: string;
  useLoyaltyPoints?: boolean;
}

export const checkout = (payload: CheckoutPayload) =>
  cartFetch<{ id: string; orderNumber: string; total: string }>("/orders/checkout", {
    method: "POST",
    body: JSON.stringify(payload),
  });
