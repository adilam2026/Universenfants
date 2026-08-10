"use client";

import { useState } from "react";
import { Search, X, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  searchProducts,
  addProductUpsell,
  removeProductUpsell,
  type ProductSearchResult,
  type UpsellEntry,
} from "@/lib/products";

/** "Vous pourriez aussi aimer" sur la fiche produit — association manuelle
 * produit → produit, sert à la fois d'upsell (montée en gamme) et de
 * cross-sell (produit complémentaire) : le modèle Upsell ne distingue pas
 * les deux, seul le choix des produits associés par l'admin fait la nuance. */
export function ProductUpsellsCard({
  productId,
  upsells,
  onChanged,
}: {
  productId: string;
  upsells: UpsellEntry[];
  onChanged: (upsells: UpsellEntry[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(q: string) {
    setQuery(q);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const { items } = await searchProducts(q);
      setResults(items.filter((p) => p.id !== productId && !upsells.some((u) => u.suggestedProduct.id === p.id)));
    } finally {
      setSearching(false);
    }
  }

  async function handleAdd(suggestedProductId: string) {
    setError(null);
    try {
      const updated = await addProductUpsell(productId, suggestedProductId);
      onChanged(updated);
      setQuery("");
      setResults([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    }
  }

  async function handleRemove(upsellId: string) {
    setError(null);
    try {
      const updated = await removeProductUpsell(productId, upsellId);
      onChanged(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-1.5"><Sparkles className="size-4" /> Produits associés (upsell / cross-sell)</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-xs text-muted-foreground">Affichés sur la fiche produit dans « Vous pourriez aussi aimer ».</p>

        {upsells.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {upsells.map((u) => (
              <div key={u.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <span>{u.suggestedProduct.nameFr} <span className="text-muted-foreground">({u.suggestedProduct.sku})</span></span>
                <button onClick={() => handleRemove(u.id)} className="text-muted-foreground hover:text-destructive" aria-label="Retirer">
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input value={query} onChange={(e) => handleSearch(e.target.value)} placeholder="Rechercher un produit à ajouter…" className="pl-8" />
        </div>
        {searching && <p className="text-xs text-muted-foreground">Recherche…</p>}
        {results.length > 0 && (
          <div className="flex flex-col gap-1 rounded-lg border border-border overflow-hidden">
            {results.map((p) => (
              <button
                key={p.id}
                onClick={() => handleAdd(p.id)}
                className="text-left px-3 py-2 text-sm hover:bg-secondary"
              >
                {p.nameFr} <span className="text-muted-foreground">({p.sku})</span>
              </button>
            ))}
          </div>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
