import { apiFetch } from "./api-client";
import type { LandingPageBlock } from "@universenfants/shared";

export interface AdminLandingPage {
  id: string;
  slug: string;
  name: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  productId: string;
  product: { nameFr: string };
  template: string;
  theme: string;
  blocks: LandingPageBlock[];
  displayPrice: string | null;
  compareAtPrice: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  ctaColor: string | null;
  ctaLabel: string | null;
  countdownEnabled: boolean;
  countdownStartAt: string | null;
  countdownEndAt: string | null;
  requireAddress: boolean;
  successPhone: string | null;
  successWhatsapp: string | null;
  successHours: string | null;
  visits: number;
  orders?: { total: string }[];
  createdAt: string;
}

export interface LandingPageAnalytics {
  visits: number;
  orders: number;
  conversionRate: number;
  revenue: number;
  avgOrderValue: number;
}

export interface UpsertLandingPagePayload {
  name: string;
  slug: string;
  productId: string;
  template: string;
  theme: string;
  blocks: LandingPageBlock[];
  displayPrice?: number;
  compareAtPrice?: number;
  primaryColor?: string;
  secondaryColor?: string;
  ctaColor?: string;
  ctaLabel?: string;
  countdownEnabled?: boolean;
  countdownStartAt?: string;
  countdownEndAt?: string;
  requireAddress?: boolean;
  successPhone?: string;
  successWhatsapp?: string;
  successHours?: string;
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
}

export const listLandingPages = () => apiFetch<AdminLandingPage[]>("/landing-pages/admin");
export const getLandingPage = (id: string) => apiFetch<AdminLandingPage>(`/landing-pages/admin/${id}`);
export const getLandingPageAnalytics = (id: string) => apiFetch<LandingPageAnalytics>(`/landing-pages/admin/${id}/analytics`);
export const createLandingPage = (payload: UpsertLandingPagePayload) =>
  apiFetch<AdminLandingPage>("/landing-pages/admin", { method: "POST", body: JSON.stringify(payload) });
export const updateLandingPage = (id: string, payload: UpsertLandingPagePayload) =>
  apiFetch<AdminLandingPage>(`/landing-pages/admin/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
export const duplicateLandingPage = (id: string) =>
  apiFetch<AdminLandingPage>(`/landing-pages/admin/${id}/duplicate`, { method: "POST" });
export const archiveLandingPage = (id: string) =>
  apiFetch<AdminLandingPage>(`/landing-pages/admin/${id}/archive`, { method: "PATCH" });
