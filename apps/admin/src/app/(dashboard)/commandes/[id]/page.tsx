"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ORDER_NEXT_STATUS, type OrderStatus } from "@universenfants/shared";
import { getAdminOrder, updateOrderStatus, recordOrderPayment, type AdminOrderDetail } from "@/lib/orders";
import { ApiError } from "@/lib/api-client";

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

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");

  function refresh() {
    getAdminOrder(id).then(setOrder).catch((e) => setError(e instanceof Error ? e.message : "Commande introuvable"));
  }

  useEffect(refresh, [id]);

  async function handleStatusChange(status: string) {
    setUpdating(status);
    setError(null);
    try {
      await updateOrderStatus(id, status);
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    } finally {
      setUpdating(null);
    }
  }

  async function handlePayment() {
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) return;
    try {
      await recordOrderPayment(id, amount);
      setPaymentAmount("");
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    }
  }

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!order) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  const nextStatuses = ORDER_NEXT_STATUS[order.status as OrderStatus] ?? [];

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">
        <Link href="/commandes" className="hover:text-foreground">Commandes</Link> › {order.orderNumber}
      </p>
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <h1 className="text-xl font-bold">{order.orderNumber}</h1>
        <Badge variant={order.status === "DELIVERED" ? "success" : order.status === "CANCELLED" ? "destructive" : "primary"}>
          {STATUS_LABEL[order.status] ?? order.status}
        </Badge>
        <Badge variant={order.paymentStatus === "PAID" ? "success" : "outline"}>{order.paymentStatus}</Badge>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-5 items-start">
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader><CardTitle>Produits</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                {order.lines.map((l) => (
                  <div key={l.id} className="flex justify-between text-sm">
                    <span>{l.productNameSnapshot} × {l.quantity} <span className="text-muted-foreground">({l.skuSnapshot})</span></span>
                    <span className="font-medium">{dh(l.lineTotal)}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-1.5 text-sm pt-3 mt-3 border-t border-border">
                <div className="flex justify-between text-muted-foreground"><span>Sous-total</span><span>{dh(order.subtotal)}</span></div>
                {Number(order.discount) > 0 && <div className="flex justify-between text-brand-success"><span>Remise</span><span>-{dh(order.discount)}</span></div>}
                <div className="flex justify-between text-muted-foreground"><span>Livraison</span><span>{dh(order.shippingFee)}</span></div>
                <div className="flex justify-between font-bold text-base pt-2 border-t border-border"><span>Total TTC</span><span>{dh(order.total)}</span></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Historique</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {order.statusHistory.map((h) => (
                  <div key={h.id} className="px-5 py-3 text-sm flex justify-between">
                    <span>{h.fromStatus ? `${STATUS_LABEL[h.fromStatus]} → ` : ""}{STATUS_LABEL[h.toStatus] ?? h.toStatus}</span>
                    <span className="text-muted-foreground text-xs">{new Date(h.createdAt).toLocaleString("fr-FR")}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader><CardTitle>Client</CardTitle></CardHeader>
            <CardContent className="text-sm flex flex-col gap-1.5">
              <p className="font-medium">{order.customer.firstName} {order.customer.lastName}</p>
              <p className="text-muted-foreground">{order.customer.phone}</p>
              {order.customer.email && <p className="text-muted-foreground">{order.customer.email}</p>}
              <p className="text-muted-foreground pt-2 border-t border-border mt-1.5">{order.shippingAddress}, {order.shippingCity}</p>
            </CardContent>
          </Card>

          {nextStatuses.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Changer le statut</CardTitle></CardHeader>
              <CardContent className="flex flex-col gap-2">
                {nextStatuses.map((s) => (
                  <Button
                    key={s}
                    variant={s === "CANCELLED" ? "destructive" : "default"}
                    size="sm"
                    disabled={updating === s}
                    onClick={() => handleStatusChange(s)}
                  >
                    {updating === s ? "…" : `→ ${STATUS_LABEL[s]}`}
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Paiement (COD)</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2.5">
              <p className="text-sm text-muted-foreground">Encaissé : {dh(order.paidAmount)} / {dh(order.total)}</p>
              {order.paymentStatus !== "PAID" && (
                <div className="flex gap-2">
                  <Input type="number" min={0} step="0.01" placeholder="Montant" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
                  <Button size="sm" onClick={handlePayment}>Enregistrer</Button>
                </div>
              )}
            </CardContent>
          </Card>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </div>
    </div>
  );
}
