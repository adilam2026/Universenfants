"use client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
const TOKEN_KEY = "ue_cart_token";
const AUTH_KEY = "ue_customer_token";

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

export function setCustomerToken(token: string) {
  window.localStorage.setItem(AUTH_KEY, token);
}

export function clearCustomerToken() {
  window.localStorage.removeItem(AUTH_KEY);
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
  const customerToken = getCustomerToken();
  if (customerToken) headers.Authorization = `Bearer ${customerToken}`;

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
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
