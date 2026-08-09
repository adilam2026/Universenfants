"use client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
const TOKEN_KEY = "ue_staff_token";
const USER_KEY = "ue_staff_user";

export const STAFF_SESSION_CHANGED_EVENT = "ue:staff-session-changed";

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function getStaffToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

// Cache la valeur parsée par chaîne JSON brute : useSyncExternalStore (voir
// useStaffUser) exige que getSnapshot renvoie une référence stable tant que
// la donnée sous-jacente n'a pas changé, sous peine de boucle infinie —
// JSON.parse à chaque appel créerait un nouvel objet à chaque rendu.
let cachedRaw: string | null = null;
let cachedUser: StaffUser | null = null;

export function getStaffUser(): StaffUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedUser = raw ? (JSON.parse(raw) as StaffUser) : null;
  }
  return cachedUser;
}

function setSession(accessToken: string, user: StaffUser) {
  window.localStorage.setItem(TOKEN_KEY, accessToken);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event(STAFF_SESSION_CHANGED_EVENT));
}

export function clearSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event(STAFF_SESSION_CHANGED_EVENT));
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };
  const token = getStaffToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.message ?? `Erreur (${res.status})`, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function staffLogin(email: string, password: string) {
  const data = await apiFetch<{ accessToken: string; refreshToken: string; user: StaffUser }>("/auth/staff/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setSession(data.accessToken, data.user);
  return data.user;
}
