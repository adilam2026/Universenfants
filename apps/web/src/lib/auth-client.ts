"use client";

import {
  getCustomerToken,
  setCustomerToken,
  clearCustomerToken,
  refreshCustomerAccessToken,
  getValidCustomerToken,
} from "@/lib/cart-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
const FETCH_TIMEOUT_MS = 10_000;

// Jamais de tentative de refresh sur ces routes : un 401 y est une réponse
// normale (identifiants invalides), pas une expiration de session.
const NO_REFRESH_PATHS = ["/auth/customer/login", "/auth/customer/register", "/auth/customer/refresh"];

export interface CustomerProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  ordersCount: number;
  totalSpent: string;
  loyaltyPoints: number;
}

async function authFetch<T>(path: string, init?: RequestInit, isRetry = false): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };
  const skipAuth = NO_REFRESH_PATHS.includes(path);
  const token = skipAuth ? getCustomerToken() : await getValidCustomerToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...init, headers, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });

  // Filet de sécurité si le rafraîchissement proactif ci-dessus a manqué la
  // fenêtre (horloge client décalée, etc.) — /me et /orders utilisent
  // JwtAuthGuard, qui renvoie bien 401 sur un token expiré (contrairement à
  // OptionalJwtAuthGuard côté panier/checkout, géré par getValidCustomerToken).
  if (res.status === 401 && !isRetry && !skipAuth) {
    const newToken = await refreshCustomerAccessToken();
    if (newToken) return authFetch<T>(path, init, true);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Erreur (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  password: string;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

export async function register(payload: RegisterPayload) {
  const { accessToken, refreshToken } = await authFetch<{ accessToken: string; refreshToken: string }>(
    "/auth/customer/register",
    { method: "POST", body: JSON.stringify(payload) },
  );
  setCustomerToken(accessToken, refreshToken);
  return accessToken;
}

export async function login(payload: LoginPayload) {
  const { accessToken, refreshToken } = await authFetch<{ accessToken: string; refreshToken: string }>(
    "/auth/customer/login",
    { method: "POST", body: JSON.stringify(payload) },
  );
  setCustomerToken(accessToken, refreshToken);
  return accessToken;
}

export function logout() {
  clearCustomerToken();
}

export function forgotPassword(email: string) {
  return authFetch<{ ok: true }>("/auth/customer/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(token: string, password: string) {
  return authFetch<{ ok: true }>("/auth/customer/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}

export function isLoggedIn() {
  return Boolean(getCustomerToken());
}

export function me() {
  return authFetch<CustomerProfile>("/auth/customer/me");
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  total: string;
  createdAt: string;
}

export function getMyOrders() {
  return authFetch<OrderSummary[]>("/orders");
}

export interface OrderLine {
  id: string;
  productNameSnapshot: string;
  skuSnapshot: string;
  sellPriceSnapshot: string;
  quantity: number;
  lineTotal: string;
}

export interface OrderStatusHistoryEntry {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  createdAt: string;
}

export interface OrderDetail extends OrderSummary {
  subtotal: string;
  shippingFee: string;
  discount: string;
  loyaltyDiscount: string;
  vatAmount: string;
  shippingCity: string;
  shippingAddress: string;
  shippingPhone: string;
  lines: OrderLine[];
  statusHistory: OrderStatusHistoryEntry[];
}

export function getMyOrder(id: string) {
  return authFetch<OrderDetail>(`/orders/${id}`);
}

export function cancelMyOrder(id: string) {
  return authFetch<OrderDetail>(`/orders/${id}/cancel`, { method: "PATCH" });
}
