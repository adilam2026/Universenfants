"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
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

const RANGE_OPTIONS = [
  { days: 7, label: "7 jours" },
  { days: 30, label: "30 jours" },
  { days: 90, label: "90 jours" },
];

function ChangeBadge({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  const positive = pct >= 0;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-bold", positive ? "text-primary" : "text-destructive")}>
      {positive ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
      {positive ? "+" : ""}{pct}%
    </span>
  );
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);

  useEffect(() => {
    getAnalyticsSummary(days).then(setSummary);
  }, [days]);

  if (!summary) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  const maxRevenue = Math.max(1, ...summary.revenueByDay.map((d) => d.revenue));

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold mb-1">Analytics</h1>
          <p className="text-sm text-muted-foreground">Derniers {summary.days} jours, vs période précédente équivalente</p>
        </div>
        <div className="flex rounded-lg border border-border p-0.5 gap-0.5">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              onClick={() => setDays(opt.days)}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded-md",
                days === opt.days ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-3.5 mb-6">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground font-medium">Chiffre d&apos;affaires</p>
            <p className="text-2xl font-bold mt-1">{dh(summary.totalRevenue)}</p>
            <ChangeBadge pct={summary.comparison.revenueChangePct} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground font-medium">Commandes</p>
            <p className="text-2xl font-bold mt-1">{summary.totalOrders}</p>
            <ChangeBadge pct={summary.comparison.ordersChangePct} />
          </CardContent>
        </Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground font-medium">Panier moyen</p><p className="text-2xl font-bold mt-1">{dh(summary.avgOrderValue)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground font-medium">Marge brute</p><p className="text-2xl font-bold mt-1">{dh(summary.totalMargin)}</p><p className="text-xs text-muted-foreground mt-0.5">{summary.marginRate}% du CA</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground font-medium">Articles / commande</p><p className="text-2xl font-bold mt-1">{summary.avgItemsPerOrder}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground font-medium">Nouveaux clients</p><p className="text-2xl font-bold mt-1">{summary.newCustomers}</p></CardContent></Card>
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

      <div className="grid sm:grid-cols-3 gap-3.5 mt-5">
        <Card>
          <CardHeader><CardTitle>Conversion</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Fiches produit vues</span><span className="font-bold">{summary.conversion.productViews}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Visiteurs uniques</span><span className="font-bold">{summary.conversion.viewSessions}</span></div>
            <div className="flex justify-between pt-2 border-t border-border">
              <span className="text-muted-foreground">Taux de conversion</span>
              <span className="font-bold">{summary.conversion.conversionRatePct === null ? "—" : `${summary.conversion.conversionRatePct}%`}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Top wishlist</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {summary.topWishlisted.map((w) => (
                <div key={w.name} className="flex justify-between px-5 py-2.5 text-sm">
                  <span className="truncate">{w.name}</span>
                  <span className="font-bold shrink-0 ml-2">{w.count}</span>
                </div>
              ))}
              {summary.topWishlisted.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Aucune donnée.</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Fidélité</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Points gagnés</span><span className="font-bold text-brand-success">+{summary.loyalty.pointsEarned}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Points utilisés</span><span className="font-bold text-destructive">-{summary.loyalty.pointsRedeemed}</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
