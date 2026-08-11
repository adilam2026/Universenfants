"use client";

import { WISHLIST_UPDATED_EVENT } from "@/lib/wishlist-events";
import type { WishlistLine } from "@/lib/wishlist-client";

const STORAGE_KEY = "ue_guest_wishlist";

function readAll(): WishlistLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as WishlistLine[]) : [];
  } catch {
    return [];
  }
}

function writeAll(lines: WishlistLine[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  window.dispatchEvent(new Event(WISHLIST_UPDATED_EVENT));
}

export function getGuestWishlist(): WishlistLine[] {
  return readAll();
}

export function addToGuestWishlist(line: WishlistLine) {
  const lines = readAll();
  if (lines.some((l) => l.productId === line.productId)) return lines;
  const next = [line, ...lines];
  writeAll(next);
  return next;
}

export function removeFromGuestWishlist(productId: string) {
  const next = readAll().filter((l) => l.productId !== productId);
  writeAll(next);
  return next;
}

export function clearGuestWishlist() {
  window.localStorage.removeItem(STORAGE_KEY);
}
