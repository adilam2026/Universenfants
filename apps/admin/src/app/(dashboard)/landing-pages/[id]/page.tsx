"use client";

import { use, useEffect, useState } from "react";
import { LandingPageForm } from "@/components/landing-page-form";
import { getLandingPage, getLandingPageAnalytics, type AdminLandingPage, type LandingPageAnalytics } from "@/lib/landing-pages";

function dh(value: number) {
  return `${value.toLocaleString("fr-FR")} DH`;
}

export default function EditLandingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [page, setPage] = useState<AdminLandingPage | null>(null);
  const [stats, setStats] = useState<LandingPageAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getLandingPage(id).then(setPage).catch((e) => setError(e instanceof Error ? e.message : "Introuvable"));
    getLandingPageAnalytics(id).then(setStats).catch(() => undefined);
  }, [id]);

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!page) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  return (
    <div>
      <h1 className="text-xl font-bold mb-3">{page.name}</h1>
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Visites", value: stats.visits },
            { label: "Commandes", value: stats.orders },
            { label: "Taux de conversion", value: `${Math.round(stats.conversionRate * 100)}%` },
            { label: "CA généré", value: dh(stats.revenue) },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-border bg-card p-3.5">
              <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
              <p className="text-lg font-bold mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>
      )}
      <LandingPageForm page={page} />
    </div>
  );
}
