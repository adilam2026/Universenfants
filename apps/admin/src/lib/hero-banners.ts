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
  imageMobile: string;
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

async function submitForm(
  url: string,
  method: "POST" | "PATCH",
  fields: HeroBannerFieldsPayload,
  fileDesktop?: File | null,
  fileMobile?: File | null,
): Promise<AdminHeroBanner> {
  const formData = new FormData();
  // Une valeur vide ("") est envoyée telle quelle — c'est ce qui permet à
  // l'admin d'effacer volontairement un sous-titre ou une date de
  // validité existants ; seul `undefined` (champ non concerné par cet
  // appel, ex. le simple bouton Activer/Désactiver) est omis.
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) formData.append(key, String(value));
  }
  if (fileDesktop) formData.append("fileDesktop", fileDesktop);
  if (fileMobile) formData.append("fileMobile", fileMobile);
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

export const createHeroBanner = (fields: HeroBannerFieldsPayload, fileDesktop: File, fileMobile?: File | null) =>
  submitForm(`${API_URL}/hero-banners`, "POST", fields, fileDesktop, fileMobile);
export const updateHeroBanner = (id: string, fields: HeroBannerFieldsPayload, fileDesktop?: File | null, fileMobile?: File | null) =>
  submitForm(`${API_URL}/hero-banners/${id}`, "PATCH", fields, fileDesktop, fileMobile);
export const removeHeroBanner = (id: string) => apiFetch<{ ok: boolean }>(`/hero-banners/${id}`, { method: "DELETE" });
