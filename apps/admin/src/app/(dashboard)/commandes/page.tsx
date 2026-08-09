"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { listAdminOrders, type AdminOrderSummary } from "@/lib/orders";

function dh(value: string | number) {
  return `${Number(value).toLocaleString("fr-FR")} DH`;
}

const STATUSES = ["", "PENDING", "CONFIRMED", "PREPARING", "SHIPPED", "DELIVERED", "CANCELLED"];
const STATUS_LABEL: Record<string, string> = {
  "": "Tous les statuts",
  PENDING: "En attente",
  CONFIRMED: "Confirmée",
  PREPARING: "En préparation",
  SHIPPED: "Expédiée",
  DELIVERED: "Livrée",
  CANCELLED: "Annulée",
};
const STATUS_VARIANT: Record<string, "default" | "primary" | "success" | "warning" | "destructive"> = {
  PENDING: "default",
  CONFIRMED: "primary",
  PREPARING: "warning",
  SHIPPED: "primary",
  DELIVERED: "success",
  CANCELLED: "destructive",
};

export default function OrdersListPage() {
  const [orders, setOrders] = useState<AdminOrderSummary[] | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    // Changer rapidement de filtre déclenche plusieurs requêtes en vol — sans
    // ce garde, une réponse plus lente pour un ancien filtre peut arriver
    // après une réponse plus récente et écraser la liste avec des résultats
    // qui ne correspondent plus au filtre affiché.
    let cancelled = false;
    listAdminOrders({ status: status || undefined }).then((result) => {
      if (!cancelled) setOrders(result);
    });
    return () => {
      cancelled = true;
    };
  }, [status]);

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h1 className="text-xl font-bold">Commandes</h1>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Numéro</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Ville</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Montant</th>
              <th className="px-4 py-3">Statut</th>
            </tr>
          </thead>
          <tbody>
            {orders?.map((o) => (
              <tr key={o.id} className="border-b border-border last:border-0 hover:bg-secondary/50">
                <td className="px-4 py-3">
                  <Link href={`/commandes/${o.id}`} className="font-bold hover:text-primary">{o.orderNumber}</Link>
                </td>
                <td className="px-4 py-3">{o.customer.firstName} {o.customer.lastName}</td>
                <td className="px-4 py-3 text-muted-foreground">{o.shippingCity}</td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(o.createdAt).toLocaleDateString("fr-FR")}</td>
                <td className="px-4 py-3 font-medium">{dh(o.total)}</td>
                <td className="px-4 py-3"><Badge variant={STATUS_VARIANT[o.status] ?? "default"}>{STATUS_LABEL[o.status] ?? o.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders && orders.length === 0 && <p className="text-sm text-muted-foreground text-center py-10">Aucune commande.</p>}
        {!orders && <p className="text-sm text-muted-foreground text-center py-10">Chargement…</p>}
      </div>
    </div>
  );
}
