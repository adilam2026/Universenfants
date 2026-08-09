"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  createVariant,
  removeVariant,
  updateVariant,
  type AdminProductVariant,
  type VariantPayload,
} from "@/lib/products";

const emptyForm: VariantPayload = { sku: "", label: "", price: undefined, stock: 0 };

export function ProductVariantsCard({
  productId,
  variants,
  onChanged,
}: {
  productId: string;
  variants: AdminProductVariant[];
  onChanged: (variants: AdminProductVariant[]) => void;
}) {
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<VariantPayload>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startCreate() {
    setForm(emptyForm);
    setEditingId("new");
    setError(null);
  }

  function startEdit(v: AdminProductVariant) {
    setForm({
      sku: v.sku,
      label: v.label,
      price: v.price ? Number(v.price) : undefined,
      stock: v.stock,
      image: v.image ?? undefined,
    });
    setEditingId(v.id);
    setError(null);
  }

  function cancel() {
    setEditingId(null);
    setError(null);
  }

  async function save() {
    if (!form.sku.trim() || !form.label.trim()) {
      setError("SKU et libellé sont requis");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated =
        editingId === "new"
          ? await createVariant(productId, form)
          : await updateVariant(productId, editingId as string, form);
      onChanged(updated);
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(variantId: string) {
    setError(null);
    try {
      const updated = await removeVariant(productId, variantId);
      onChanged(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Variantes (taille, couleur…)</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-3">
        {variants.length === 0 && editingId === null && (
          <p className="text-xs text-muted-foreground">Aucune variante — ce produit n&apos;a qu&apos;une seule déclinaison.</p>
        )}

        {variants.map((v) => (
          <div key={v.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
            <div className="flex flex-col">
              <span className="text-sm font-semibold">{v.label}</span>
              <span className="text-xs text-muted-foreground">
                SKU {v.sku} · Stock {v.stock}
                {v.price && <> · {Number(v.price).toFixed(2)} DH</>}
              </span>
            </div>
            <div className="flex gap-1">
              <Button type="button" size="sm" variant="outline" onClick={() => startEdit(v)}>
                <Pencil className="size-3.5" />
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => handleRemove(v.id)}>
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}

        {editingId !== null ? (
          <div className="flex flex-col gap-2.5 rounded-md border border-border p-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs">SKU</Label>
                <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Libellé</Label>
                <Input
                  placeholder="Rouge, Grand modèle…"
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Prix (vide = prix produit)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.price ?? ""}
                  onChange={(e) => setForm({ ...form, price: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Stock</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.stock ?? 0}
                  onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
                />
              </div>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={save} disabled={saving}>
                {saving ? "Enregistrement…" : "Enregistrer"}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={cancel}>
                <X className="size-3.5" /> Annuler
              </Button>
            </div>
          </div>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={startCreate} className="self-start">
            <Plus className="size-3.5" /> Ajouter une variante
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
