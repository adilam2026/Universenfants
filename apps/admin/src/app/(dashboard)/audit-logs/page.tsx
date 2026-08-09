"use client";

import { Fragment, useEffect, useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { listAuditLogs, type AuditLogEntry } from "@/lib/audit-logs";

function formatValue(value: unknown) {
  if (value === null || value === undefined) return "—";
  return JSON.stringify(value);
}

export default function AuditLogsPage() {
  const [data, setData] = useState<{ items: AuditLogEntry[]; total: number; page: number; limit: number } | null>(null);
  const [entity, setEntity] = useState("");
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    listAuditLogs({ entity: entity || undefined, action: action || undefined, page }).then(setData);
  }, [entity, action, page]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Journal d&apos;audit</h1>
      <p className="text-sm text-muted-foreground mb-5">
        Historique des actions sensibles du Back-Office (coupons, promotions, paramètres, villes, connexions staff…).
      </p>

      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1); }}
            placeholder="Filtrer par action (ex: coupon.update)"
            className="pl-9"
          />
        </div>
        <Input
          value={entity}
          onChange={(e) => { setEntity(e.target.value); setPage(1); }}
          placeholder="Filtrer par entité (ex: Coupon)"
          className="max-w-xs"
        />
      </div>

      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Auteur</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entité</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {data?.items.map((entry) => (
              <Fragment key={entry.id}>
                <tr className="border-b border-border last:border-0 hover:bg-secondary/50">
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {new Date(entry.createdAt).toLocaleString("fr-FR")}
                  </td>
                  <td className="px-4 py-3">{entry.staffUser ? entry.staffUser.name : "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{entry.action}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {entry.entity} <span className="text-xs">#{entry.entityId.slice(0, 8)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      {expandedId === entry.id ? "Masquer" : "Détails"}
                    </button>
                  </td>
                </tr>
                {expandedId === entry.id && (
                  <tr className="border-b border-border bg-secondary/30">
                    <td colSpan={5} className="px-4 py-3">
                      <div className="grid sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="font-bold uppercase text-muted-foreground mb-1">Avant</p>
                          <pre className="whitespace-pre-wrap break-all">{formatValue(entry.oldValue)}</pre>
                        </div>
                        <div>
                          <p className="font-bold uppercase text-muted-foreground mb-1">Après</p>
                          <pre className="whitespace-pre-wrap break-all">{formatValue(entry.newValue)}</pre>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        {!data && <p className="text-sm text-muted-foreground text-center py-10">Chargement…</p>}
        {data && data.items.length === 0 && <p className="text-sm text-muted-foreground text-center py-10">Aucune entrée.</p>}
      </div>

      {data && data.total > data.limit && (
        <div className="flex items-center justify-between mt-3.5">
          <p className="text-xs text-muted-foreground">
            Page {data.page} / {totalPages} — {data.total} entrées
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="size-4" /> Précédent
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Suivant <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
