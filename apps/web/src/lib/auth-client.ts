"use client";

import { getCustomerToken, setCustomerToken, clearCustomerToken } from "@/lib/cart-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

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

async function authFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };
  const token = getCustomerToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
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
  const { accessToken } = await authFetch<{ accessToken: string; refreshToken: string }>("/auth/customer/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  setCustomerToken(accessToken);
  return accessToken;
}

export async function login(payload: LoginPayload) {
  const { accessToken } = await authFetch<{ accessToken: string; refreshToken: string }>("/auth/customer/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  setCustomerToken(accessToken);
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
