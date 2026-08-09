"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useCart, broadcastCartUpdate } from "@/hooks/use-cart";
import { useStoreSettings } from "@/hooks/use-store-settings";
import { checkout } from "@/lib/cart-client";
import { isLoggedIn, me, type CustomerProfile } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";

function dh(value: number) {
  return `${value.toLocaleString("fr-FR")} DH`;
}

export default function CheckoutPage() {
  const t = useTranslations("checkout");
  const { cart, loading } = useCart();
  const storeSettings = useStoreSettings();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [useLoyaltyPoints, setUseLoyaltyPoints] = useState(false);
  const [selectedCity, setSelectedCity] = useState("");

  useEffect(() => {
    if (isLoggedIn()) me().then(setProfile).catch(() => undefined);
  }, []);

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
        useLoyaltyPoints: useLoyaltyPoints || undefined,
      });
      broadcastCartUpdate();
      router.push(`/commande/confirmation?orderNumber=${order.orderNumber}&total=${order.total}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
      setSubmitting(false);
    }
  }

  if (loading || !storeSettings) return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">{t("loading")}</div>;
  if (!cart || cart.lines.length === 0) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">{t("empty")}</div>;
  }

  // Frais de port réels de la ville choisie (le "seuil de livraison offerte"
  // peut lui-même varier par ville) — jamais un montant fixe codé en dur qui
  // diverge du Back-Office et du montant réellement facturé au serveur.
  const cityInfo = storeSettings.cities.find((c) => c.name === selectedCity) ?? null;
  const shipping = cityInfo ? (cart.subtotal >= cityInfo.freeShippingFrom ? 0 : cityInfo.shippingFee) : 0;
  const maxLoyaltyDiscount = Math.max(0, cart.subtotal - cart.discount);
  const loyaltyRate = storeSettings.settings.loyaltyRedeemRate;
  const loyaltyDiscount =
    useLoyaltyPoints && profile ? Math.min(Math.floor(profile.loyaltyPoints / loyaltyRate), maxLoyaltyDiscount) : 0;
  const total = Math.max(0, cart.subtotal - cart.discount - loyaltyDiscount + shipping);

  return (
    <div className="mx-auto max-w-3xl px-4 md:px-7 py-4">
      <h1 className="font-display text-2xl font-extrabold mb-1">{t("title")}</h1>
      <p className="text-sm text-muted-foreground mb-6">{t("guestNotice")}</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <section className="rounded-2xl border border-border bg-card p-4">
          <h3 className="font-bold mb-3.5">{t("step1")}</h3>
          <div className="grid sm:grid-cols-2 gap-3.5">
            <Field label={t("firstName")} name="firstName" required placeholder="Salma" />
            <Field label={t("lastName")} name="lastName" required placeholder="El Amrani" />
            <Field label={t("phone")} name="phone" required placeholder="06 XX XX XX XX" />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="checkout-city" className="text-xs font-bold text-muted-foreground">{t("city")} *</label>
              <select
                id="checkout-city"
                name="city"
                required
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="rounded-lg border border-border px-3 py-2.5 text-sm"
              >
                <option value="">{t("chooseCity")}</option>
                {storeSettings.cities.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <Field label={t("email")} name="email" type="email" placeholder="vous@exemple.com" />
            <div className="sm:col-span-2">
              <Field label={t("address")} name="addressLine" required placeholder={t("addressPlaceholder")} />
            </div>
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label htmlFor="checkout-comment" className="text-xs font-bold text-muted-foreground">{t("comment")}</label>
              <textarea id="checkout-comment" name="comment" rows={2} className="rounded-lg border border-border px-3 py-2.5 text-sm" placeholder={t("commentPlaceholder")} />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h3 className="font-bold mb-3.5">{t("step2")}</h3>
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
          {cityInfo && (
            <div className="flex justify-between text-sm mt-2.5">
              <span className="text-muted-foreground">{t("shipping")}</span>
              <span>{shipping === 0 ? t("free") : dh(shipping)}</span>
            </div>
          )}
          {profile && profile.loyaltyPoints > 0 && (
            <label className="flex items-center gap-2.5 text-sm rounded-xl bg-secondary p-3 mt-3.5 cursor-pointer">
              <input
                type="checkbox"
                checked={useLoyaltyPoints}
                onChange={(e) => setUseLoyaltyPoints(e.target.checked)}
                className="size-4"
              />
              {t("useLoyaltyPoints", { n: profile.loyaltyPoints, amount: dh(Math.round(profile.loyaltyPoints / loyaltyRate)) })}
            </label>
          )}
          {loyaltyDiscount > 0 && (
            <div className="flex justify-between text-sm text-brand-success mt-2.5">
              <span>{t("loyaltyDiscountApplied")}</span>
              <span>-{dh(loyaltyDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between font-extrabold text-lg pt-3 mt-3 border-t border-border">
            <span>{t("total")}</span>
            <span>{dh(total)}</span>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h3 className="font-bold mb-3">{t("step3")}</h3>
          <div className="rounded-xl bg-brand-highlight-soft text-brand-highlight-foreground p-3 text-sm mb-4">
            💵 <strong>{t("codTitle")}</strong> {t("codText")}
          </div>
          {error && <p className="text-sm text-destructive mb-3">{error}</p>}
          <Button type="submit" variant="cta" className="w-full" disabled={submitting}>
            {submitting ? t("submitting") : t("submit", { total: dh(total) })}
          </Button>
        </section>
      </form>
    </div>
  );
}

function Field({ label, name, required, placeholder, type = "text" }: { label: string; name: string; required?: boolean; placeholder?: string; type?: string }) {
  const id = `checkout-${name}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-bold text-muted-foreground">
        {label} {required && "*"}
      </label>
      <input id={id} name={name} type={type} required={required} placeholder={placeholder} className="rounded-lg border border-border px-3 py-2.5 text-sm" />
    </div>
  );
}
