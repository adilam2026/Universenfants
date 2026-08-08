"use client";

import { useState, type FormEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adjustStock, archiveProduct, type AdminProduct, type StockAdjustReason } from "@/lib/products";
import { ApiError } from "@/lib/api-client";

const REASONS: { value: StockAdjustReason; label: string }[] = [
  { value: "SUPPLIER_RECEIPT", label: "Réception fournisseur" },
  { value: "INVENTORY_CORRECTION", label: "Correction d'inventaire" },
  { value: "RETURN", label: "Retour client" },
];

export function StockAdjustCard({ product, onAdjusted }: { product: AdminProduct; onAdjusted: (newStock: number) => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    try {
      const { stock } = await adjustStock(product.id, Number(form.get("delta")), form.get("reason") as StockAdjustReason);
      onAdjusted(stock);
      formEl.reset();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleArchive() {
    setArchiving(true);
    try {
      await archiveProduct(product.id);
      window.location.href = "/produits";
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
      setArchiving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader><CardTitle>Stock</CardTitle></CardHeader>
        <CardContent>
          <p className="text-2xl font-bold mb-1">{product.stock}</p>
          <p className="text-xs text-muted-foreground mb-4">
            {product.reservedStock} réservée{product.reservedStock > 1 ? "s" : ""} · seuil d&apos;alerte {product.alertThreshold}
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <Label htmlFor="delta">Ajustement (+/-)</Label>
              <Input id="delta" name="delta" type="number" required className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="reason">Motif</Label>
              <select
                id="reason"
                name="reason"
                required
                className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="submit" size="sm" disabled={submitting}>{submitting ? "…" : "Ajuster le stock"}</Button>
          </form>
        </CardContent>
      </Card>

      {product.status !== "ARCHIVED" && (
        <Card>
          <CardContent className="p-4">
            <Button type="button" variant="destructive" size="sm" className="w-full" onClick={handleArchive} disabled={archiving}>
              {archiving ? "…" : "Archiver le produit"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
