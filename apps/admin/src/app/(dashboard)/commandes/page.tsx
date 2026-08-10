"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import useSWR, { preload } from "swr";
import { Download, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableSkeleton } from "@/components/ui/skeleton";
import { listAdminOrders, orderListKey, exportOrders } from "@/lib/orders";
import { LIST_PAGE_SIZE } from "@/lib/list-defaults";

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
  const [status, setStatus] = useState("");
  const [queryInput, setQueryInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(queryInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [queryInput]);

  // Revenir à la page 1 quand le filtre de statut change — ajusté pendant le
  // rendu plutôt que dans un effet (même pattern que admin-shell.tsx) pour
  // éviter un rendu intermédiaire sur l'ancienne page avec le nouveau filtre.
  const [prevStatus, setPrevStatus] = useState(status);
  if (status !== prevStatus) {
    setPrevStatus(status);
    setPage(1);
  }

  async function handleExport() {
    setExporting(true);
    try {
      await exportOrders({ status: status || undefined });
    } catch {
      // silencieux : l'admin peut réessayer, pas d'état d'erreur dédié pour un export
    } finally {
      setExporting(false);
    }
  }

  const filters = { status: status || undefined, q: q || undefined, page, limit: LIST_PAGE_SIZE };
  const { data } = useSWR(orderListKey(filters), () => listAdminOrders(filters));
  const orders = data?.items ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / LIST_PAGE_SIZE)) : 1;

  useEffect(() => {
    if (data && page < totalPages) {
      const nextFilters = { ...filters, page: page + 1 };
      preload(orderListKey(nextFilters), () => listAdminOrders(nextFilters));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, page, totalPages, status, q]);

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h1 className="text-xl font-bold">Commandes</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input value={queryInput} onChange={(e) => setQueryInput(e.target.value)} placeholder="Numéro, client, téléphone…" className="pl-9 w-56" />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
            <Download className="size-4" /> {exporting ? "…" : "Exporter"}
          </Button>
        </div>
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
            {orders.map((o) => (
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
        {data && orders.length === 0 && <p className="text-sm text-muted-foreground text-center py-10">Aucune commande.</p>}
        {!data && <TableSkeleton columns={6} />}
      </div>

      {data && data.total > 0 && (
        <div className="flex items-center justify-between mt-3.5 text-sm text-muted-foreground">
          <p>{data.total} commande{data.total > 1 ? "s" : ""} · page {page} / {totalPages}</p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              <ChevronLeft className="size-4" /> Précédent
            </Button>
            <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              Suivant <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
