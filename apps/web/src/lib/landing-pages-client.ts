import type { LandingPageBlock } from "@universenfants/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export interface PublicLandingPage {
  id: string;
  slug: string;
  name: string;
  status: string;
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
  product: {
    id: string;
    nameFr: string;
    price: string;
    promoPrice: string | null;
    images: { url: string; thumbnailUrl: string | null }[];
  };
}

export async function getLandingPageBySlug(slug: string): Promise<PublicLandingPage | null> {
  const res = await fetch(`${API_URL}/landing-pages/${slug}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export function trackLandingPageVisit(slug: string) {
  fetch(`${API_URL}/landing-pages/${slug}/visit`, { method: "POST" }).catch(() => undefined);
}

export interface QuickOrderPayload {
  name: string;
  phone: string;
  city: string;
  quantity?: number;
  addressLine?: string;
}

export async function submitQuickOrder(slug: string, payload: QuickOrderPayload) {
  const res = await fetch(`${API_URL}/landing-pages/${slug}/quick-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Erreur (${res.status})`);
  }
  return res.json() as Promise<{ orderNumber: string; total: string }>;
}
