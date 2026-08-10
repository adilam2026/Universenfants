"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Plus, Trash2, Search, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listBundles, createBundle, removeBundle, type AdminBundle } from "@/lib/bundles";
import { searchProducts, type ProductSearchResult } from "@/lib/products";
import { ApiError } from "@/lib/api-client";

interface PickedItem {
  productId: string;
  nameFr: string;
  sku: string;
  quantity: number;
}

export default function BundlesPage() {
  const [bundles, setBundles] = useState<AdminBundle[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [items, setItems] = useState<PickedItem[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductSearchResult[]>([]);

  function refresh() {
    listBundles().then(setBundles);
  }
  useEffect(refresh, []);

  async function handleSearch(q: string) {
    setQuery(q);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const { items: found } = await searchProducts(q);
    setResults(found.filter((p) => !items.some((i) => i.productId === p.id)));
  }

  function addItem(p: ProductSearchResult) {
    setItems((prev) => [...prev, { productId: p.id, nameFr: p.nameFr, sku: p.sku, quantity: 1 }]);
    setQuery("");
    setResults([]);
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (items.length < 2) {
      setError("Un lot doit contenir au moins 2 produits");
      return;
    }
    setCreating(true);
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    try {
      await createBundle({
        name: String(form.get("name")),
        bundlePrice: Number(form.get("bundlePrice")),
        status: "ACTIVE",
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      });
      formEl.reset();
      setItems([]);
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    } finally {
      setCreating(false);
    }
  }

  async function handleRemove(id: string) {
    setError(null);
    try {
      await removeBundle(id);
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Lots (bundles)</h1>
      <p className="text-sm text-muted-foreground mb-5">
        Regroupements de produits affichés sur la page « Lots » du site. Le prix de lot est indicatif : chaque article est
        ajouté au panier à son prix individuel réel (aucune remise de lot n&apos;est appliquée au paiement pour l&apos;instant).
      </p>

      <Card className="mb-5">
        <CardHeader><CardTitle>Créer un lot</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex flex-col gap-3.5">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Nom du lot</Label>
                <Input name="name" required placeholder="ex: Kit premiers pas" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Prix de lot indicatif (DH)</Label>
                <Input name="bundlePrice" type="number" step="0.01" min={0} required />
              </div>
            </div>

            {items.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {items.map((i) => (
                  <div key={i.productId} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                    <span>{i.nameFr} <span className="text-muted-foreground">({i.sku})</span></span>
                    <button type="button" onClick={() => removeItem(i.productId)} className="text-muted-foreground hover:text-destructive" aria-label="Retirer">
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input value={query} onChange={(e) => handleSearch(e.target.value)} placeholder="Rechercher un produit à ajouter au lot…" className="pl-8" />
            </div>
            {results.length > 0 && (
              <div className="flex flex-col gap-1 rounded-lg border border-border overflow-hidden">
                {results.map((p) => (
                  <button key={p.id} type="button" onClick={() => addItem(p)} className="text-left px-3 py-2 text-sm hover:bg-secondary">
                    {p.nameFr} <span className="text-muted-foreground">({p.sku})</span>
                  </button>
                ))}
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={creating} className="w-fit"><Plus className="size-4" /> Créer le lot</Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        {bundles?.map((b) => (
          <Card key={b.id}>
            <CardContent className="p-3.5 flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-sm">{b.name}</p>
                <p className="text-xs text-muted-foreground">
                  {b.items.map((i) => i.product.nameFr).join(", ")} · {Number(b.bundlePrice).toLocaleString("fr-FR")} DH indicatif
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => handleRemove(b.id)} aria-label="Supprimer">
                <Trash2 className="size-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
        {bundles && bundles.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Aucun lot créé.</p>}
        {!bundles && <p className="text-sm text-muted-foreground">Chargement…</p>}
      </div>
    </div>
  );
}
