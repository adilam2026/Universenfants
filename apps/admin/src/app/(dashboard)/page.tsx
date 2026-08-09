"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShoppingCart, Wallet, AlertTriangle, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listAdminOrders, type AdminOrderSummary } from "@/lib/orders";
import { listAdminProducts, type AdminProduct } from "@/lib/products";

function dh(value: string | number) {
  return `${Number(value).toLocaleString("fr-FR")} DH`;
}

const STATUS_VARIANT: Record<string, "default" | "primary" | "success" | "warning" | "destructive"> = {
  PENDING: "default",
  CONFIRMED: "primary",
  PREPARING: "warning",
  SHIPPED: "primary",
  DELIVERED: "success",
  CANCELLED: "destructive",
};

export default function DashboardPage() {
  const [orders, setOrders] = useState<AdminOrderSummary[] | null>(null);
  const [lowStock, setLowStock] = useState<AdminProduct[] | null>(null);

  useEffect(() => {
    listAdminOrders().then(setOrders);
    listAdminProducts({ lowStock: true }).then(setLowStock);
  }, []);

  const pendingOrders = orders?.filter((o) => o.status === "PENDING").length ?? 0;
  const revenue = orders?.filter((o) => o.status !== "CANCELLED").reduce((s, o) => s + Number(o.total), 0) ?? 0;
  const recentOrders = orders?.slice(0, 8) ?? [];

  return (
    <div>
      <h1 className="text-xl font-bold mb-5">Dashboard</h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        <KpiCard icon={ShoppingCart} label="Commandes" value={orders ? String(orders.length) : "…"} />
        <KpiCard icon={Wallet} label="Chiffre d'affaires" value={orders ? dh(revenue) : "…"} />
        <KpiCard icon={Package} label="En attente" value={String(pendingOrders)} accent="highlight" />
        <KpiCard icon={AlertTriangle} label="Stock faible" value={lowStock ? String(lowStock.length) : "…"} accent="destructive" />
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-5">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Commandes récentes</CardTitle>
            <Link href="/commandes" className="text-xs font-bold text-primary">Voir tout</Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {recentOrders.map((o) => (
                <Link key={o.id} href={`/commandes/${o.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-secondary/50">
                  <div>
                    <p className="text-sm font-bold">{o.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">{o.customer.firstName} {o.customer.lastName} · {o.shippingCity}</p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-bold">{dh(o.total)}</span>
                    <Badge variant={STATUS_VARIANT[o.status] ?? "default"}>{o.status}</Badge>
                  </div>
                </Link>
              ))}
              {orders && orders.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">Aucune commande.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Alertes stock</CardTitle>
            <Link href="/produits" className="text-xs font-bold text-primary">Voir tout</Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {lowStock?.map((p) => (
                <Link key={p.id} href={`/produits/${p.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-secondary/50">
                  <span className="text-sm font-medium truncate">{p.nameFr}</span>
                  <Badge variant="warning">{p.stock} / {p.alertThreshold}</Badge>
                </Link>
              ))}
              {lowStock && lowStock.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">Aucune alerte.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, accent }: { icon: typeof ShoppingCart; label: string; value: string; accent?: "highlight" | "destructive" }) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-3.5">
        <div
          className={`flex size-10 items-center justify-center rounded-md ${
            accent === "highlight" ? "bg-brand-highlight-soft text-brand-highlight-foreground" : accent === "destructive" ? "bg-destructive/10 text-destructive" : "bg-brand-primary-soft text-primary"
          }`}
        >
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          <p className="text-lg font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
