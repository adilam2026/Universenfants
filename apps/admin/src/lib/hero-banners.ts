import { apiFetch, getStaffToken } from "./api-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
const UPLOAD_TIMEOUT_MS = 30_000;

export interface AdminHeroBanner {
  id: string;
  titleFr: string;
  titleAr: string | null;
  subtitleFr: string | null;
  subtitleAr: string | null;
  imageDesktop: string;
  link: string | null;
  order: number;
  startAt: string | null;
  endAt: string | null;
  status: "DRAFT" | "SCHEDULED" | "ACTIVE" | "ENDED";
}

export interface HeroBannerFieldsPayload {
  titleFr: string;
  titleAr?: string;
  subtitleFr?: string;
  subtitleAr?: string;
  link?: string;
  order?: number;
  startAt?: string;
  endAt?: string;
  status?: string;
}

export const listHeroBanners = () => apiFetch<AdminHeroBanner[]>("/hero-banners");

async function submitForm(url: string, method: "POST" | "PATCH", fields: HeroBannerFieldsPayload, file?: File | null): Promise<AdminHeroBanner> {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== "") formData.append(key, String(value));
  }
  if (file) formData.append("file", file);
  const token = getStaffToken();
  const res = await fetch(url, {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
    signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Erreur (${res.status})`);
  }
  return res.json();
}

export const createHeroBanner = (fields: HeroBannerFieldsPayload, file: File) => submitForm(`${API_URL}/hero-banners`, "POST", fields, file);
export const updateHeroBanner = (id: string, fields: HeroBannerFieldsPayload, file?: File | null) =>
  submitForm(`${API_URL}/hero-banners/${id}`, "PATCH", fields, file);
export const removeHeroBanner = (id: string) => apiFetch<{ ok: boolean }>(`/hero-banners/${id}`, { method: "DELETE" });
