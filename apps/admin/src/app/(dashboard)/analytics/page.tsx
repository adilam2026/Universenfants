"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAnalyticsSummary, type AnalyticsSummary } from "@/lib/analytics";

function dh(value: number) {
  return `${value.toLocaleString("fr-FR")} DH`;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "En attente",
  CONFIRMED: "Confirmée",
  PREPARING: "En préparation",
  SHIPPED: "Expédiée",
  DELIVERED: "Livrée",
  CANCELLED: "Annulée",
};

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);

  useEffect(() => {
    getAnalyticsSummary().then(setSummary);
  }, []);

  if (!summary) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  const maxRevenue = Math.max(1, ...summary.revenueByDay.map((d) => d.revenue));

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Analytics</h1>
      <p className="text-sm text-muted-foreground mb-5">30 derniers jours</p>

      <div className="grid sm:grid-cols-3 gap-3.5 mb-6">
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground font-medium">Chiffre d&apos;affaires</p><p className="text-2xl font-bold mt-1">{dh(summary.totalRevenue)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground font-medium">Commandes</p><p className="text-2xl font-bold mt-1">{summary.totalOrders}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground font-medium">Panier moyen</p><p className="text-2xl font-bold mt-1">{dh(summary.avgOrderValue)}</p></CardContent></Card>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-5">
        <Card>
          <CardHeader><CardTitle>Chiffre d&apos;affaires par jour</CardTitle></CardHeader>
          <CardContent>
            {summary.revenueByDay.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée sur la période.</p>
            ) : (
              <div className="flex gap-1.5 h-48">
                {summary.revenueByDay.map((d) => (
                  <div key={d.date} className="flex-1 flex flex-col items-center justify-end gap-1 group relative">
                    <div
                      className="w-full rounded-t bg-primary hover:bg-brand-primary-strong transition-colors"
                      style={{ height: `${Math.max(2, (d.revenue / maxRevenue) * 100)}%` }}
                      title={`${d.date} — ${dh(d.revenue)}`}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader><CardTitle>Top produits</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {summary.topProducts.map((p) => (
                  <div key={p.name} className="flex justify-between px-5 py-2.5 text-sm">
                    <span className="truncate">{p.name}</span>
                    <span className="font-bold shrink-0 ml-2">{dh(p.revenue)}</span>
                  </div>
                ))}
                {summary.topProducts.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Aucune donnée.</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Commandes par statut</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              {Object.entries(summary.ordersByStatus).map(([status, count]) => (
                <div key={status} className="flex justify-between">
                  <span className="text-muted-foreground">{STATUS_LABEL[status] ?? status}</span>
                  <span className="font-bold">{count}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
