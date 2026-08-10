"use client";

import Link from "next/link";
import useSWR from "swr";
import { ShoppingCart, Wallet, AlertTriangle, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CardSkeleton, KpiSkeleton } from "@/components/ui/skeleton";
import { listAdminOrders, getAdminOrderStats, orderListKey, type AdminOrderSummary, type AdminOrderStats } from "@/lib/orders";
import { listAdminProducts, productListKey, type AdminProduct } from "@/lib/products";

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

const RECENT_LIMIT = 8;

export default function DashboardPage() {
  // Hooks indépendants plutôt qu'un seul `Promise.all` : un appel lent (ex:
  // agrégats sur un gros historique) ne doit pas retarder l'affichage d'un
  // autre bloc, et inversement — chaque bloc du Dashboard arrive dès que sa
  // propre donnée est prête. Les KPI (totaux, CA, en attente) viennent d'un
  // endpoint d'agrégats dédié (`count`/`aggregate` côté base) plutôt que de
  // sommer côté client une liste de commandes — sans ça, afficher 4 nombres
  // aurait exigé de rapatrier l'historique complet des commandes.
  const { data: stats } = useSWR<AdminOrderStats>("/orders/admin/stats", getAdminOrderStats);
  const { data: recentOrdersPage } = useSWR<Awaited<ReturnType<typeof listAdminOrders>>>(orderListKey({ limit: RECENT_LIMIT }), () =>
    listAdminOrders({ limit: RECENT_LIMIT }),
  );
  const lowStockKey = productListKey({ lowStock: true, limit: RECENT_LIMIT });
  const { data: lowStockPage } = useSWR<Awaited<ReturnType<typeof listAdminProducts>>>(lowStockKey, () =>
    listAdminProducts({ lowStock: true, limit: RECENT_LIMIT }),
  );

  const recentOrders: AdminOrderSummary[] = recentOrdersPage?.items ?? [];
  const lowStock: AdminProduct[] = lowStockPage?.items ?? [];

  return (
    <div>
      <h1 className="text-xl font-bold mb-5">Dashboard</h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        {stats ? (
          <>
            <KpiCard icon={ShoppingCart} label="Commandes" value={String(stats.totalOrders)} />
            <KpiCard icon={Wallet} label="Chiffre d'affaires" value={dh(stats.revenue)} />
            <KpiCard icon={Package} label="En attente" value={String(stats.pendingOrders)} accent="highlight" />
          </>
        ) : (
          <>
            <Card><KpiSkeleton /></Card>
            <Card><KpiSkeleton /></Card>
            <Card><KpiSkeleton /></Card>
          </>
        )}
        {lowStockPage ? (
          <KpiCard icon={AlertTriangle} label="Stock faible" value={String(lowStockPage.total)} accent="destructive" />
        ) : (
          <Card><KpiSkeleton /></Card>
        )}
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-5">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Commandes récentes</CardTitle>
            <Link href="/commandes" className="text-xs font-bold text-primary">Voir tout</Link>
          </CardHeader>
          <CardContent className="p-0">
            {!recentOrdersPage && <CardSkeleton lines={4} />}
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
              {recentOrdersPage && recentOrders.length === 0 && (
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
            {!lowStockPage && <CardSkeleton lines={4} />}
            <div className="divide-y divide-border">
              {lowStock.map((p) => (
                <Link key={p.id} href={`/produits/${p.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-secondary/50">
                  <span className="text-sm font-medium truncate">{p.nameFr}</span>
                  <Badge variant="warning">{p.stock} / {p.alertThreshold}</Badge>
                </Link>
              ))}
              {lowStockPage && lowStock.length === 0 && (
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
