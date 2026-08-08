"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Package } from "lucide-react";
import { isLoggedIn, getMyOrders, type OrderSummary } from "@/lib/auth-client";

function dh(value: string | number) {
  return `${Number(value).toLocaleString("fr-FR")} DH`;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "En attente",
  CONFIRMED: "Confirmée",
  PREPARING: "En préparation",
  SHIPPED: "Expédiée",
  DELIVERED: "Livrée",
  CANCELLED: "Annulée",
};

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-secondary text-muted-foreground",
  CONFIRMED: "bg-brand-primary-soft text-primary",
  PREPARING: "bg-brand-highlight-soft text-brand-highlight-foreground",
  SHIPPED: "bg-brand-primary-soft text-primary",
  DELIVERED: "bg-brand-success/15 text-brand-success",
  CANCELLED: "bg-destructive/10 text-destructive",
};

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      setLoggedIn(false);
      return;
    }
    setLoggedIn(true);
    getMyOrders().then(setOrders);
  }, []);

  if (loggedIn === null) return null;

  if (!loggedIn) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-muted-foreground mb-4">Connectez-vous pour voir vos commandes.</p>
        <Link href="/compte" className="text-primary font-bold text-sm">Se connecter</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 md:px-7 py-6">
      <p className="text-xs text-muted-foreground mb-1">
        <Link href="/compte" className="hover:text-foreground">Mon compte</Link> › Mes commandes
      </p>
      <h1 className="font-display text-2xl font-extrabold mb-5">📦 Mes commandes</h1>

      {!orders ? (
        <p className="text-sm text-muted-foreground py-10 text-center">Chargement…</p>
      ) : orders.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <Package className="mx-auto size-10 mb-3 opacity-40" />
          <p className="mb-4">Vous n&apos;avez pas encore de commande</p>
          <Link href="/" className="text-primary font-bold text-sm">Voir le catalogue</Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-border divide-y divide-border overflow-hidden bg-card">
          {orders.map((o) => (
            <Link key={o.id} href={`/compte/commandes/${o.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-secondary/50">
              <div>
                <p className="font-bold text-sm">{o.orderNumber}</p>
                <p className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleDateString("fr-FR")}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-sm">{dh(o.total)}</span>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_STYLE[o.status] ?? "bg-secondary"}`}>
                  {STATUS_LABEL[o.status] ?? o.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
