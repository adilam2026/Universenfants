"use client";

import Link from "next/link";
import { useState } from "react";
import { Minus, Plus, Trash2, Share2, ShoppingBag } from "lucide-react";
import { useCart, broadcastCartUpdate } from "@/hooks/use-cart";
import { updateCartLine, removeCartLine, applyCoupon, removeCoupon, shareCart } from "@/lib/cart-client";
import { Button } from "@/components/ui/button";

function dh(value: number) {
  return `${value.toLocaleString("fr-FR")} DH`;
}

export default function CartPage() {
  const { cart, loading, refresh } = useCart();
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

  if (loading) return <div className="mx-auto max-w-6xl px-4 py-16 text-center text-muted-foreground">Chargement…</div>;

  const isEmpty = !cart || cart.lines.length === 0;
  const shipping = cart && cart.subtotal > 0 ? (cart.subtotal >= 300 ? 0 : 25) : 0;
  const total = cart ? Math.max(0, cart.subtotal - cart.discount + shipping) : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-7 py-4">
      <h1 className="font-display text-2xl font-extrabold mb-5">🛍 Mon panier</h1>

      {isEmpty ? (
        <div className="py-16 text-center text-muted-foreground">
          <ShoppingBag className="mx-auto size-10 mb-3 opacity-40" />
          <p className="mb-4">Ton panier est vide</p>
          <Button asChild>
            <Link href="/">Voir le catalogue</Link>
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-[1fr_320px] gap-7">
          <div className="flex flex-col gap-3">
            <div className="rounded-2xl border border-border divide-y divide-border overflow-hidden bg-card">
              {cart.lines.map((line) => (
                <div key={line.id} className="flex gap-3 p-3.5">
                  <div className="size-16 shrink-0 rounded-xl bg-brand-primary-soft flex items-center justify-center text-2xl">🧸</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold">{line.name}</p>
                    {line.variantLabel && <p className="text-xs text-muted-foreground">{line.variantLabel}</p>}
                    <p className="text-xs text-muted-foreground mt-0.5">{dh(line.unitPrice)} / unité</p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center rounded-full border border-border">
                        <button onClick={() => changeQty(line.id, -1, line.quantity)} className="flex size-7 items-center justify-center" aria-label="Diminuer">
                          <Minus className="size-3.5" />
                        </button>
                        <span className="w-6 text-center text-sm font-bold">{line.quantity}</span>
                        <button onClick={() => changeQty(line.id, 1, line.quantity)} className="flex size-7 items-center justify-center" aria-label="Augmenter">
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                      <button onClick={() => remove(line.id)} className="text-xs font-bold text-muted-foreground hover:text-destructive flex items-center gap-1">
                        <Trash2 className="size-3.5" /> Supprimer
                      </button>
                    </div>
                  </div>
                  <span className="font-display font-extrabold text-sm">{dh(line.unitPrice * line.quantity)}</span>
                </div>
              ))}
            </div>
            <Button variant="secondary" onClick={handleShare} className="self-start">
              <Share2 className="size-4" /> Partager mon panier (achat collaboratif)
            </Button>
            {shareLink && (
              <p className="text-xs text-muted-foreground rounded-lg bg-secondary p-2.5 break-all">
                Lien : <span className="font-bold">{shareLink}</span>
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 h-fit">
            <h3 className="font-bold mb-3.5">Résumé</h3>
            <div className="flex gap-2 mb-1">
              <input
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                placeholder="Ex : RENTREE10"
                className="flex-1 rounded-lg border border-border px-3 py-2 text-sm"
              />
              <Button variant="outline" size="sm" onClick={handleCoupon}>
                Valider
              </Button>
            </div>
            {couponError && <p className="text-xs text-destructive mb-2">{couponError}</p>}
            {cart.couponCode && (
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-brand-success">Code {cart.couponCode} appliqué</span>
                <button
                  onClick={async () => {
                    await removeCoupon();
                    refresh();
                  }}
                  className="text-xs text-muted-foreground underline"
                >
                  Retirer
                </button>
              </div>
            )}
            <div className="flex flex-col gap-2 text-sm pt-3 border-t border-border mt-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sous-total</span>
                <span>{dh(cart.subtotal)}</span>
              </div>
              {cart.discount > 0 && (
                <div className="flex justify-between text-brand-success">
                  <span>Remise coupon</span>
                  <span>-{dh(cart.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Livraison</span>
                <span>{shipping === 0 ? "Offerte" : dh(shipping)}</span>
              </div>
              <div className="flex justify-between text-lg font-extrabold pt-2 border-t border-border">
                <span>Total</span>
                <span>{dh(total)}</span>
              </div>
              <p className="text-[11px] text-muted-foreground text-right">dont TVA 20% incluse : {dh(Math.round((total * 0.2) / 1.2))}</p>
            </div>
            <Button asChild variant="cta" className="w-full mt-4">
              <Link href="/checkout">Passer la commande</Link>
            </Button>
            <p className="text-[11px] text-muted-foreground text-center mt-2">Paiement à la livraison uniquement</p>
          </div>
        </div>
      )}
    </div>
  );
}
