"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { isLoggedIn, getMyOrder, type OrderDetail } from "@/lib/auth-client";

function dh(value: string | number) {
  return `${Number(value).toLocaleString("fr-FR")} DH`;
}

const STEPS = [
  { status: "PENDING", label: "Créée" },
  { status: "CONFIRMED", label: "Confirmée" },
  { status: "PREPARING", label: "Préparation" },
  { status: "SHIPPED", label: "Expédiée" },
  { status: "DELIVERED", label: "Livrée" },
];

const STATUS_LABEL: Record<string, string> = {
  PENDING: "En attente",
  CONFIRMED: "Confirmée",
  PREPARING: "En préparation",
  SHIPPED: "Expédiée",
  DELIVERED: "Livrée",
  CANCELLED: "Annulée",
};

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      setLoggedIn(false);
      return;
    }
    setLoggedIn(true);
    getMyOrder(id)
      .then(setOrder)
      .catch((e) => setError(e instanceof Error ? e.message : "Commande introuvable"));
  }, [id]);

  if (loggedIn === null) return null;
  if (!loggedIn) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-muted-foreground mb-4">Connectez-vous pour voir cette commande.</p>
        <Link href="/compte" className="text-primary font-bold text-sm">Se connecter</Link>
      </div>
    );
  }
  if (error) return <div className="mx-auto max-w-md px-4 py-16 text-center text-muted-foreground">{error}</div>;
  if (!order) return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">Chargement…</div>;

  const currentIdx = order.status === "CANCELLED" ? -1 : STEPS.findIndex((s) => s.status === order.status);

  return (
    <div className="mx-auto max-w-3xl px-4 md:px-7 py-6">
      <p className="text-xs text-muted-foreground mb-1">
        <Link href="/compte/commandes" className="hover:text-foreground">Mes commandes</Link> › {order.orderNumber}
      </p>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <h1 className="font-display text-xl font-extrabold">Commande {order.orderNumber}</h1>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold">{STATUS_LABEL[order.status] ?? order.status}</span>
      </div>

      {order.status !== "CANCELLED" && (
        <div className="rounded-2xl border border-border bg-card p-4 mb-4">
          <h3 className="font-bold mb-4">Suivi</h3>
          <div className="flex justify-between gap-1">
            {STEPS.map((s, i) => (
              <div key={s.status} className="flex flex-col items-center gap-1.5 flex-1 px-0.5">
                <div
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full text-xs font-bold",
                    i <= currentIdx ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
                  )}
                >
                  {i <= currentIdx ? <Check className="size-3.5" /> : i + 1}
                </div>
                <span className="text-[11px] text-center font-bold">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-4 mb-4">
        <h3 className="font-bold mb-3.5">Produits</h3>
        <div className="flex flex-col gap-2">
          {order.lines.map((l) => (
            <div key={l.id} className="flex justify-between text-sm">
              <span>{l.productNameSnapshot} × {l.quantity}</span>
              <span className="font-bold">{dh(l.lineTotal)}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1.5 text-sm pt-3 mt-3 border-t border-border">
          <div className="flex justify-between text-muted-foreground">
            <span>Sous-total</span>
            <span>{dh(order.subtotal)}</span>
          </div>
          {Number(order.discount) > 0 && (
            <div className="flex justify-between text-brand-success">
              <span>Remise</span>
              <span>-{dh(order.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-muted-foreground">
            <span>Livraison</span>
            <span>{Number(order.shippingFee) === 0 ? "Offerte" : dh(order.shippingFee)}</span>
          </div>
          <div className="flex justify-between font-extrabold text-lg pt-2 border-t border-border">
            <span>Total TTC</span>
            <span>{dh(order.total)}</span>
          </div>
          <p className="text-[11px] text-muted-foreground text-right">dont TVA 20% incluse : {dh(order.vatAmount)}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
        Livraison : {order.shippingAddress}, {order.shippingCity} · {order.shippingPhone}
      </div>
    </div>
  );
}
