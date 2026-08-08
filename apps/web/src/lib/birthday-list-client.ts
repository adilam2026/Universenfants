"use client";

import { getCartToken, getCustomerToken } from "@/lib/cart-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

async function blFetch<T>(path: string, init?: RequestInit): Promise<T> {
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

export interface BirthdayListItem {
  id: string;
  productId?: string;
  reserved: boolean;
  product: {
    id: string;
    nameFr: string;
    nameAr: string | null;
    seoUrl: string;
    price: string;
    promoPrice: string | null;
    image: string | null;
  };
}

export interface BirthdayList {
  id: string;
  childName: string;
  eventDate: string;
  message: string | null;
  shareToken: string;
  items: BirthdayListItem[];
}

export interface CreateBirthdayListPayload {
  childName: string;
  eventDate: string;
  message?: string;
}

export const getMyBirthdayLists = () => blFetch<BirthdayList[]>("/birthday-lists/mine");
export const createBirthdayList = (payload: CreateBirthdayListPayload) =>
  blFetch<BirthdayList>("/birthday-lists", { method: "POST", body: JSON.stringify(payload) });
export const addBirthdayListItem = (listId: string, productId: string) =>
  blFetch<BirthdayList[]>(`/birthday-lists/${listId}/items`, { method: "POST", body: JSON.stringify({ productId }) });
export const removeBirthdayListItem = (listId: string, itemId: string) =>
  blFetch<BirthdayList[]>(`/birthday-lists/${listId}/items/${itemId}`, { method: "DELETE" });

export const getSharedBirthdayList = (shareToken: string) =>
  blFetch<Omit<BirthdayList, "shareToken">>(`/birthday-lists/shared/${shareToken}`);

export const reserveBirthdayListItem = (shareToken: string, itemId: string) =>
  blFetch<Omit<BirthdayList, "shareToken">>(`/birthday-lists/shared/${shareToken}/items/${itemId}/reserve`, {
    method: "POST",
    headers: { "x-cart-token": getCartToken() },
  });
