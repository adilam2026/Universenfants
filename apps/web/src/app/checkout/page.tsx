"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useCart, broadcastCartUpdate } from "@/hooks/use-cart";
import { checkout } from "@/lib/cart-client";
import { Button } from "@/components/ui/button";

const CITIES = ["Casablanca", "Rabat", "Marrakech", "Fès", "Tanger", "Agadir"];

function dh(value: number) {
  return `${value.toLocaleString("fr-FR")} DH`;
}

export default function CheckoutPage() {
  const { cart, loading } = useCart();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    try {
      const order = await checkout({
        firstName: String(form.get("firstName")),
        lastName: String(form.get("lastName")),
        phone: String(form.get("phone")),
        email: String(form.get("email") || "") || undefined,
        city: String(form.get("city")),
        addressLine: String(form.get("addressLine")),
        comment: String(form.get("comment") || "") || undefined,
      });
      broadcastCartUpdate();
      router.push(`/commande/confirmation?orderNumber=${order.orderNumber}&total=${order.total}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
      setSubmitting(false);
    }
  }

  if (loading) return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">Chargement…</div>;
  if (!cart || cart.lines.length === 0) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">Votre panier est vide.</div>;
  }

  const shipping = cart.subtotal >= 300 ? 0 : 25;
  const total = Math.max(0, cart.subtotal - cart.discount + shipping);

  return (
    <div className="mx-auto max-w-3xl px-4 md:px-7 py-4">
      <h1 className="font-display text-2xl font-extrabold mb-1">Finaliser ma commande</h1>
      <p className="text-sm text-muted-foreground mb-6">Commande invité possible — pas besoin de créer de compte.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <section className="rounded-2xl border border-border bg-card p-4">
          <h3 className="font-bold mb-3.5">1. Vos informations</h3>
          <div className="grid sm:grid-cols-2 gap-3.5">
            <Field label="Nom" name="firstName" required placeholder="Salma" />
            <Field label="Prénom" name="lastName" required placeholder="El Amrani" />
            <Field label="Téléphone" name="phone" required placeholder="06 XX XX XX XX" />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-muted-foreground">Ville *</label>
              <select name="city" required className="rounded-lg border border-border px-3 py-2.5 text-sm">
                <option value="">Choisir une ville…</option>
                {CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <Field label="Email (optionnel)" name="email" type="email" placeholder="vous@exemple.com" />
            <div className="sm:col-span-2">
              <Field label="Adresse complète" name="addressLine" required placeholder="Rue, quartier, n° d'immeuble…" />
            </div>
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label className="text-xs font-bold text-muted-foreground">Commentaire (optionnel)</label>
              <textarea name="comment" rows={2} className="rounded-lg border border-border px-3 py-2.5 text-sm" placeholder="Indications pour le livreur…" />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h3 className="font-bold mb-3.5">2. Récapitulatif</h3>
          <div className="flex flex-col gap-1.5 text-sm">
            {cart.lines.map((l) => (
              <div key={l.id} className="flex justify-between">
                <span>
                  {l.name} × {l.quantity}
                </span>
                <span>{dh(l.unitPrice * l.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between font-extrabold text-lg pt-3 mt-3 border-t border-border">
            <span>Total</span>
            <span>{dh(total)}</span>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h3 className="font-bold mb-3">3. Validation</h3>
          <div className="rounded-xl bg-brand-highlight-soft text-brand-highlight-foreground p-3 text-sm mb-4">
            💵 <strong>Paiement à la livraison.</strong> Vous payez en espèces directement au livreur à réception de votre commande.
          </div>
          {error && <p className="text-sm text-destructive mb-3">{error}</p>}
          <Button type="submit" variant="cta" className="w-full" disabled={submitting}>
            {submitting ? "Validation en cours…" : `Confirmer ma commande — ${dh(total)}`}
          </Button>
        </section>
      </form>
    </div>
  );
}

function Field({ label, name, required, placeholder, type = "text" }: { label: string; name: string; required?: boolean; placeholder?: string; type?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-muted-foreground">
        {label} {required && "*"}
      </label>
      <input name={name} type={type} required={required} placeholder={placeholder} className="rounded-lg border border-border px-3 py-2.5 text-sm" />
    </div>
  );
}
