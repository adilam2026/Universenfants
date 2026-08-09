"use client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
const TOKEN_KEY = "ue_staff_token";
const USER_KEY = "ue_staff_user";
const REFRESH_KEY = "ue_staff_refresh_token";
const FETCH_TIMEOUT_MS = 10_000;

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

function getStaffRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_KEY);
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

function setSession(accessToken: string, user: StaffUser, refreshToken?: string) {
  window.localStorage.setItem(TOKEN_KEY, accessToken);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  if (refreshToken) window.localStorage.setItem(REFRESH_KEY, refreshToken);
  window.dispatchEvent(new Event(STAFF_SESSION_CHANGED_EVENT));
}

export function clearSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
  window.dispatchEvent(new Event(STAFF_SESSION_CHANGED_EVENT));
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// L'access token expire au bout de 15 min (JWT_ACCESS_EXPIRES_IN) — sans ce
// mécanisme, toute session staff se termine brutalement après 15 min, même
// avec un refresh token valide 30 jours. Dédupliqué : plusieurs requêtes en
// 401 simultanées ne déclenchent qu'un seul appel /refresh.
let refreshInFlight: Promise<string | null> | null = null;

function refreshStaffAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  const refreshToken = getStaffRefreshToken();
  if (!refreshToken) return Promise.resolve(null);

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/staff/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) {
        clearSession();
        return null;
      }
      const data = (await res.json()) as { accessToken: string; refreshToken: string; user: StaffUser };
      setSession(data.accessToken, data.user, data.refreshToken);
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

async function getValidStaffToken(): Promise<string | null> {
  const token = getStaffToken();
  if (!token) return null;
  const expiresAt = decodeJwtExpiry(token);
  const expiringSoon = expiresAt !== null && Date.now() >= expiresAt - 30_000;
  if (expiringSoon) return refreshStaffAccessToken();
  return token;
}

const NO_REFRESH_PATHS = ["/auth/staff/login", "/auth/staff/refresh"];

export async function apiFetch<T>(path: string, init?: RequestInit, isRetry = false): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };
  const skipAuth = NO_REFRESH_PATHS.includes(path);
  const token = skipAuth ? getStaffToken() : await getValidStaffToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...init, headers, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });

  // Filet de sécurité si le rafraîchissement proactif ci-dessus a manqué la
  // fenêtre (horloge client décalée, etc.).
  if (res.status === 401 && !isRetry && !skipAuth) {
    const newToken = await refreshStaffAccessToken();
    if (newToken) return apiFetch<T>(path, init, true);
  }

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
  setSession(data.accessToken, data.user, data.refreshToken);
  return data.user;
}
