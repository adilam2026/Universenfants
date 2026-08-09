"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Minus, Plus, Trash2, Share2, ShoppingBag } from "lucide-react";
import { useCart, broadcastCartUpdate } from "@/hooks/use-cart";
import { useStoreSettings } from "@/hooks/use-store-settings";
import { updateCartLine, removeCartLine, applyCoupon, removeCoupon, shareCart } from "@/lib/cart-client";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

function dh(value: number) {
  return `${value.toLocaleString("fr-FR")} DH`;
}

export default function CartPage() {
  const t = useTranslations("cart");
  const { cart, loading, refresh } = useCart();
  const storeSettings = useStoreSettings();
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);

  async function changeQty(lineId: string, delta: number, current: number) {
    const next = Math.max(1, current + delta);
    await updateCartLine(lineId, next);
    broadcastCartUpdate();
    refresh();
  }

  async function remove(lineId: string) {
    await removeCartLine(lineId);
    broadcastCartUpdate();
    refresh();
  }

  async function handleCoupon() {
    setCouponError(null);
    try {
      await applyCoupon(couponInput.trim().toUpperCase());
      refresh();
    } catch (e) {
      setCouponError(e instanceof Error ? e.message : "Code invalide");
    }
  }

  async function handleShare() {
    const { shareToken } = await shareCart();
    setShareLink(`${window.location.origin}/panier?shareToken=${shareToken}`);
  }

  if (loading) return <div className="mx-auto max-w-6xl px-4 py-16 text-center text-muted-foreground">…</div>;

  const isEmpty = !cart || cart.lines.length === 0;
  // Le seuil de livraison offerte réel (réglage Back-Office) — le frais de
  // port exact dépend de la ville, pas encore choisie à ce stade, donc le
  // total ici reste hors livraison plutôt que d'inclure une estimation
  // fabriquée qui pourrait ne correspondre à aucune ville réelle.
  const freeShippingThreshold = storeSettings?.settings.freeShippingThreshold ?? null;
  const freeShipping = cart !== null && freeShippingThreshold !== null && cart.subtotal >= freeShippingThreshold;
  const total = cart ? Math.max(0, cart.subtotal - cart.discount) : 0;
  const vatRate = storeSettings?.settings.vatRate ?? null;

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-7 py-4">
      <h1 className="font-display text-2xl font-extrabold mb-5">{t("title")}</h1>

      {isEmpty ? (
        <div className="py-16 text-center text-muted-foreground">
          <ShoppingBag className="mx-auto size-10 mb-3 opacity-40" />
          <p className="mb-4">{t("empty")}</p>
          <Button asChild>
            <Link href="/">{t("browseCatalog")}</Link>
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-[1fr_320px] gap-7">
          <div className="flex flex-col gap-3">
            <div className="rounded-2xl border border-border divide-y divide-border overflow-hidden bg-card">
              {cart.lines.map((line) => (
                <div key={line.id} className="flex gap-3 p-3.5">
                  <div className="relative size-16 shrink-0 rounded-xl bg-brand-primary-soft flex items-center justify-center text-2xl overflow-hidden">
                    {line.image ? <Image src={line.image} alt="" fill sizes="64px" className="object-cover" /> : "🧸"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold">{line.name}</p>
                    {line.variantLabel && <p className="text-xs text-muted-foreground">{line.variantLabel}</p>}
                    <p className="text-xs text-muted-foreground mt-0.5">{t("unitPrice", { price: dh(line.unitPrice) })}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center rounded-full border border-border">
                        <button onClick={() => changeQty(line.id, -1, line.quantity)} className="flex size-7 items-center justify-center" aria-label={t("decrease")}>
                          <Minus className="size-3.5" />
                        </button>
                        <span className="w-6 text-center text-sm font-bold">{line.quantity}</span>
                        <button onClick={() => changeQty(line.id, 1, line.quantity)} className="flex size-7 items-center justify-center" aria-label={t("increase")}>
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                      <button onClick={() => remove(line.id)} className="text-xs font-bold text-muted-foreground hover:text-destructive flex items-center gap-1">
                        <Trash2 className="size-3.5" /> {t("remove")}
                      </button>
                    </div>
                  </div>
                  <span className="font-display font-extrabold text-sm">{dh(line.unitPrice * line.quantity)}</span>
                </div>
              ))}
            </div>
            <Button variant="secondary" onClick={handleShare} className="self-start">
              <Share2 className="size-4" /> {t("shareCart")}
            </Button>
            {shareLink && (
              <p className="text-xs text-muted-foreground rounded-lg bg-secondary p-2.5 break-all">
                {t("shareLinkLabel")} <span className="font-bold">{shareLink}</span>
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 h-fit">
            <h3 className="font-bold mb-3.5">{t("summary")}</h3>
            <div className="flex gap-2 mb-1">
              <input
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                placeholder={t("couponPlaceholder")}
                className="flex-1 rounded-lg border border-border px-3 py-2 text-sm"
              />
              <Button variant="outline" size="sm" onClick={handleCoupon}>
                {t("apply")}
              </Button>
            </div>
            {couponError && <p className="text-xs text-destructive mb-2">{couponError}</p>}
            {cart.couponCode && (
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-brand-success">{t("couponApplied", { code: cart.couponCode })}</span>
                <button
                  onClick={async () => {
                    await removeCoupon();
                    refresh();
                  }}
                  className="text-xs text-muted-foreground underline"
                >
                  {t("removeCoupon")}
                </button>
              </div>
            )}
            <div className="flex flex-col gap-2 text-sm pt-3 border-t border-border mt-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("subtotal")}</span>
                <span>{dh(cart.subtotal)}</span>
              </div>
              {cart.discount > 0 && (
                <div className="flex justify-between text-brand-success">
                  <span>{t("discount")}</span>
                  <span>-{dh(cart.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("shipping")}</span>
                <span>{freeShipping ? t("free") : t("shippingTbd")}</span>
              </div>
              <div className="flex justify-between text-lg font-extrabold pt-2 border-t border-border">
                <span>{t("total")}</span>
                <span>{dh(total)}</span>
              </div>
              {vatRate !== null && (
                <p className="text-[11px] text-muted-foreground text-right">
                  {t("vatIncluded", { rate: Math.round(vatRate * 100), amount: dh(Math.round(total - total / (1 + vatRate))) })}
                </p>
              )}
            </div>
            <Button asChild variant="cta" className="w-full mt-4">
              <Link href="/checkout">{t("checkout")}</Link>
            </Button>
            <p className="text-[11px] text-muted-foreground text-center mt-2">{t("codOnly")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
