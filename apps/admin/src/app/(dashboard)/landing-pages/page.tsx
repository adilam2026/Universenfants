"use client";

import useSWR from "swr";
import Link from "next/link";
import { Plus, Copy, ExternalLink, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/ui/skeleton";
import {
  listLandingPages,
  duplicateLandingPage,
  archiveLandingPage,
  type AdminLandingPage,
} from "@/lib/landing-pages";

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";

const STATUS_LABEL: Record<string, string> = { DRAFT: "Brouillon", ACTIVE: "Active", ARCHIVED: "Archivée" };
const STATUS_VARIANT: Record<string, "default" | "success" | "outline"> = {
  DRAFT: "default",
  ACTIVE: "success",
  ARCHIVED: "outline",
};

function dh(value: number) {
  return `${value.toLocaleString("fr-FR")} DH`;
}

export default function LandingPagesListPage() {
  const { data: pages, mutate: refresh } = useSWR<AdminLandingPage[]>("/landing-pages/admin", listLandingPages);

  async function handleDuplicate(id: string) {
    await duplicateLandingPage(id);
    refresh();
  }

  async function handleArchive(id: string) {
    await archiveLandingPage(id);
    refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">Landing Pages</h1>
        <Button asChild>
          <Link href="/landing-pages/nouveau"><Plus className="size-4" /> Nouvelle landing page</Link>
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">URL</th>
              <th className="px-4 py-3">Produit</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Créée le</th>
              <th className="px-4 py-3">Visites</th>
              <th className="px-4 py-3">Commandes</th>
              <th className="px-4 py-3">CA généré</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {pages?.map((p) => {
              const orderCount = p.orders?.length ?? 0;
              const revenue = p.orders?.reduce((s, o) => s + Number(o.total), 0) ?? 0;
              return (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-bold">
                    <Link href={`/landing-pages/${p.id}`} className="hover:underline">{p.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <a href={`${WEB_URL}/lp/${p.slug}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-primary">
                      /lp/{p.slug} <ExternalLink className="size-3" />
                    </a>
                  </td>
                  <td className="px-4 py-3">{p.product.nameFr}</td>
                  <td className="px-4 py-3"><Badge variant={STATUS_VARIANT[p.status]}>{STATUS_LABEL[p.status]}</Badge></td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(p.createdAt).toLocaleDateString("fr-FR")}</td>
                  <td className="px-4 py-3">{p.visits}</td>
                  <td className="px-4 py-3">{orderCount}{p.visits > 0 ? ` (${Math.round((orderCount / p.visits) * 100)}%)` : ""}</td>
                  <td className="px-4 py-3 font-bold">{dh(revenue)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 justify-end">
                      <Button size="sm" variant="outline" onClick={() => handleDuplicate(p.id)}>
                        <Copy className="size-3.5" />
                      </Button>
                      {p.status !== "ARCHIVED" && (
                        <Button size="sm" variant="outline" onClick={() => handleArchive(p.id)}>
                          <Archive className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {pages && pages.length === 0 && <p className="text-sm text-muted-foreground text-center py-10">Aucune landing page.</p>}
        {!pages && <TableSkeleton columns={4} />}
      </div>
    </div>
  );
}
