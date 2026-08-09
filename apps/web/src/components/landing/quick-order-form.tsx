"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { submitQuickOrder } from "@/lib/landing-pages-client";

const CITIES = ["Casablanca", "Rabat", "Marrakech", "Fès", "Tanger", "Agadir"];

export function QuickOrderForm({
  slug,
  requireAddress,
  ctaLabel,
  successPhone,
  successWhatsapp,
  successHours,
}: {
  slug: string;
  requireAddress: boolean;
  ctaLabel: string;
  successPhone: string | null;
  successWhatsapp: string | null;
  successHours: string | null;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    try {
      const order = await submitQuickOrder(slug, {
        name: String(form.get("name")),
        phone: String(form.get("phone")),
        city: String(form.get("city")),
        quantity: Number(form.get("quantity") || 1),
        addressLine: String(form.get("addressLine") || "") || undefined,
      });
      setOrderNumber(order.orderNumber);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setSubmitting(false);
    }
  }

  if (orderNumber) {
    return (
      <div id="commande" className="rounded-2xl border-2 p-6 text-center" style={{ borderColor: "var(--lp-primary, #6c5ce7)" }}>
        <CheckCircle2 className="mx-auto size-12 mb-3" style={{ color: "var(--lp-primary, #6c5ce7)" }} />
        <h3 className="text-xl font-extrabold mb-1">Commande envoyée avec succès</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Merci pour votre commande <strong>{orderNumber}</strong>. Notre équipe vous contactera rapidement pour confirmer votre demande.
        </p>
        {(successPhone || successWhatsapp || successHours) && (
          <div className="text-sm text-muted-foreground flex flex-col gap-0.5">
            {successPhone && <span>📞 {successPhone}</span>}
            {successWhatsapp && <span>💬 WhatsApp : {successWhatsapp}</span>}
            {successHours && <span>🕒 {successHours}</span>}
          </div>
        )}
      </div>
    );
  }

  return (
    <form id="commande" onSubmit={handleSubmit} className="rounded-2xl border border-border bg-white p-5 shadow-sm flex flex-col gap-3">
      <h3 className="text-center font-extrabold text-base mb-1">Commandez en 30 secondes</h3>
      <input name="name" required placeholder="Votre nom" className="rounded-lg border border-border px-3 py-2.5 text-sm" />
      <input name="phone" required placeholder="Votre téléphone" className="rounded-lg border border-border px-3 py-2.5 text-sm" />
      <select name="city" required defaultValue="" className="rounded-lg border border-border px-3 py-2.5 text-sm">
        <option value="" disabled>Votre ville</option>
        {CITIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <input name="quantity" type="number" min={1} defaultValue={1} className="rounded-lg border border-border px-3 py-2.5 text-sm" />
      {requireAddress && (
        <input name="addressLine" placeholder="Adresse complète" className="rounded-lg border border-border px-3 py-2.5 text-sm" />
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-full py-3.5 text-white font-extrabold text-base flex items-center justify-center gap-2 disabled:opacity-60"
        style={{ background: "var(--lp-cta, #ff6b81)" }}
      >
        {submitting && <Loader2 className="size-4 animate-spin" />}
        {ctaLabel}
      </button>
      <p className="text-xs text-muted-foreground text-center">Paiement à la livraison — aucun compte requis.</p>
    </form>
  );
}
