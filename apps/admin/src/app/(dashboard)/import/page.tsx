"use client";

import { useEffect, useRef, useState } from "react";
import { Upload, CheckCircle2, XCircle, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { importProductsExcel, listImportHistory, exportCatalog, type ImportSummary, type ImportLogEntry } from "@/lib/import";

const COLUMNS = [
  { name: "SKU", required: true, example: "LEGO-CTY-6012" },
  { name: "Nom", required: true, example: "LEGO City — Commissariat" },
  { name: "Catégorie", required: true, example: "construction (slug)" },
  { name: "Marque", required: false, example: "LEGO" },
  { name: "Prix", required: true, example: "599" },
  { name: "Prix de revient", required: true, example: "350" },
  { name: "Stock", required: false, example: "20" },
  { name: "URL SEO", required: true, example: "lego-city-commissariat" },
  { name: "Âge min", required: false, example: "6" },
  { name: "Âge max", required: false, example: "12" },
  { name: "Statut", required: false, example: "ACTIVE" },
];

export default function ImportPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [history, setHistory] = useState<ImportLogEntry[] | null>(null);
  const [exporting, setExporting] = useState(false);

  function refreshHistory() {
    listImportHistory().then(setHistory);
  }
  useEffect(refreshHistory, []);

  async function handleSubmit() {
    if (!file) return;
    setSubmitting(true);
    setError(null);
    setSummary(null);
    try {
      const result = await importProductsExcel(file);
      setSummary(result);
      refreshHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      await exportCatalog();
    } catch {
      setError("Impossible d'exporter le catalogue");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">Import / Export Excel</h1>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
          <Download className="size-4" /> {exporting ? "Export en cours…" : "Exporter le catalogue"}
        </Button>
      </div>

      <Card className="mb-5">
        <CardHeader><CardTitle>Format attendu</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Fichier .xlsx avec une ligne d&apos;en-tête. Chaque ligne = un produit, identifié par son SKU (mise à jour si le SKU existe déjà, création sinon).
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left font-bold uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2">Colonne</th>
                  <th className="px-3 py-2">Obligatoire</th>
                  <th className="px-3 py-2">Exemple</th>
                </tr>
              </thead>
              <tbody>
                {COLUMNS.map((c) => (
                  <tr key={c.name} className="border-b border-border last:border-0">
                    <td className="px-3 py-1.5 font-medium">{c.name}</td>
                    <td className="px-3 py-1.5">{c.required ? <Badge variant="primary">Oui</Badge> : <span className="text-muted-foreground">Non</span>}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{c.example}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Importer un fichier</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={handleSubmit} disabled={!file || submitting} className="w-fit">
            <Upload className="size-4" /> {submitting ? "Import en cours…" : "Importer"}
          </Button>

          {summary && (
            <div className="mt-2">
              <div className="flex gap-4 mb-3 text-sm">
                <span className="flex items-center gap-1.5 text-brand-success font-bold"><CheckCircle2 className="size-4" /> {summary.created} créé(s)</span>
                <span className="flex items-center gap-1.5 text-primary font-bold"><CheckCircle2 className="size-4" /> {summary.updated} mis à jour</span>
                {summary.errors > 0 && (
                  <span className="flex items-center gap-1.5 text-destructive font-bold"><XCircle className="size-4" /> {summary.errors} erreur(s)</span>
                )}
              </div>
              {summary.errors > 0 && (
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-secondary text-left font-bold uppercase tracking-wide text-muted-foreground">
                        <th className="px-3 py-2">Ligne</th>
                        <th className="px-3 py-2">SKU</th>
                        <th className="px-3 py-2">Erreur</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.results.filter((r) => r.status === "error").map((r) => (
                        <tr key={r.row} className="border-t border-border">
                          <td className="px-3 py-1.5">{r.row}</td>
                          <td className="px-3 py-1.5 font-medium">{r.sku}</td>
                          <td className="px-3 py-1.5 text-destructive">{r.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-5">
        <CardHeader><CardTitle>Historique des imports</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {history?.map((h) => (
              <div key={h.id} className="px-5 py-2.5 text-sm flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="font-medium">{h.fileName ?? "Fichier"}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {h.staffUser?.name ?? "—"} · {new Date(h.createdAt).toLocaleString("fr-FR")}
                  </span>
                </div>
                <div className="flex gap-3 text-xs font-bold">
                  <span className="text-brand-success">{h.createdCount} créé(s)</span>
                  <span className="text-primary">{h.updatedCount} mis à jour</span>
                  {h.errorCount > 0 && <span className="text-destructive">{h.errorCount} erreur(s)</span>}
                </div>
              </div>
            ))}
            {history && history.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Aucun import pour l&apos;instant.</p>}
            {!history && <p className="text-sm text-muted-foreground text-center py-8">Chargement…</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
