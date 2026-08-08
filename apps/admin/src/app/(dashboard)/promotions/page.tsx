"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { listCategories, listBrands, type AdminCategory, type AdminBrand } from "@/lib/catalog";
import { listPromotions, createPromotion, updatePromotion, type AdminPromotion } from "@/lib/promotions";
import { ApiError } from "@/lib/api-client";

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<AdminPromotion[] | null>(null);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [brands, setBrands] = useState<AdminBrand[]>([]);
  const [scope, setScope] = useState<"CATEGORY" | "BRAND" | "STORE">("STORE");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  function refresh() {
    listPromotions().then(setPromotions);
  }
  useEffect(() => {
    refresh();
    listCategories().then(setCategories);
    listBrands().then(setBrands);
  }, []);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    try {
      await createPromotion({
        name: String(form.get("name")),
        type: String(form.get("type")) as AdminPromotion["type"],
        value: Number(form.get("value")),
        scope,
        categoryId: scope === "CATEGORY" ? String(form.get("categoryId")) : undefined,
        brandId: scope === "BRAND" ? String(form.get("brandId")) : undefined,
        startAt: String(form.get("startAt")),
        endAt: String(form.get("endAt")),
      });
      formEl.reset();
      setScope("STORE");
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    } finally {
      setCreating(false);
    }
  }

  async function toggleStatus(promo: AdminPromotion) {
    const nextStatus = promo.status === "ACTIVE" ? "ENDED" : "ACTIVE";
    await updatePromotion(promo.id, {
      name: promo.name,
      type: promo.type,
      value: Number(promo.value),
      scope: promo.scope,
      categoryId: promo.categoryId ?? undefined,
      brandId: promo.brandId ?? undefined,
      startAt: promo.startAt,
      endAt: promo.endAt,
      status: nextStatus,
    });
    refresh();
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-5">Promotions</h1>

      <Card className="mb-5">
        <CardHeader><CardTitle>Nouvelle promotion</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
            <div className="flex flex-col gap-1.5 lg:col-span-2">
              <Label>Nom</Label>
              <Input name="name" required placeholder="Promo rentrée scolaire" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <select name="type" required className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="PERCENTAGE">% </option>
                <option value="FIXED_AMOUNT">Montant fixe</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Valeur</Label>
              <Input name="value" type="number" step="0.01" min={0} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Portée</Label>
              <select value={scope} onChange={(e) => setScope(e.target.value as typeof scope)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="STORE">Toute la boutique</option>
                <option value="CATEGORY">Catégorie</option>
                <option value="BRAND">Marque</option>
              </select>
            </div>
            {scope === "CATEGORY" && (
              <div className="flex flex-col gap-1.5">
                <Label>Catégorie</Label>
                <select name="categoryId" required className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.nameFr}</option>)}
                </select>
              </div>
            )}
            {scope === "BRAND" && (
              <div className="flex flex-col gap-1.5">
                <Label>Marque</Label>
                <select name="brandId" required className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label>Début</Label>
              <Input name="startAt" type="date" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Fin</Label>
              <Input name="endAt" type="date" required />
            </div>
            <div className="sm:col-span-3 lg:col-span-6">
              <Button type="submit" disabled={creating}><Plus className="size-4" /> {creating ? "Création…" : "Créer la promotion"}</Button>
            </div>
          </form>
          {error && <p className="text-sm text-destructive mt-3">{error}</p>}
        </CardContent>
      </Card>

      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Réduction</th>
              <th className="px-4 py-3">Portée</th>
              <th className="px-4 py-3">Validité</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {promotions?.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3">{p.value}{p.type === "PERCENTAGE" ? "%" : " DH"}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {p.scope === "STORE" ? "Boutique" : p.scope === "CATEGORY" ? p.category?.nameFr : p.brand?.name}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(p.startAt).toLocaleDateString("fr-FR")} → {new Date(p.endAt).toLocaleDateString("fr-FR")}</td>
                <td className="px-4 py-3"><Badge variant={p.status === "ACTIVE" ? "success" : "outline"}>{p.status}</Badge></td>
                <td className="px-4 py-3">
                  <Button size="sm" variant="outline" onClick={() => toggleStatus(p)}>
                    {p.status === "ACTIVE" ? "Désactiver" : "Activer"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {promotions && promotions.length === 0 && <p className="text-sm text-muted-foreground text-center py-10">Aucune promotion.</p>}
        {!promotions && <p className="text-sm text-muted-foreground text-center py-10">Chargement…</p>}
      </div>
    </div>
  );
}
