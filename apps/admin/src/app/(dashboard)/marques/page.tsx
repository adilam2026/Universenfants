"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listBrands, createBrand, updateBrand, type AdminBrand } from "@/lib/catalog";
import { ApiError } from "@/lib/api-client";

export default function BrandsPage() {
  const [brands, setBrands] = useState<AdminBrand[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function refresh() {
    listBrands().then(setBrands);
  }
  useEffect(refresh, []);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    try {
      await createBrand({
        name: String(form.get("name")),
        slug: String(form.get("slug")),
        website: String(form.get("website") || "") || undefined,
      });
      formEl.reset();
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRowSave(brand: AdminBrand, patch: Partial<AdminBrand>) {
    try {
      await updateBrand(brand.id, {
        name: patch.name ?? brand.name,
        slug: patch.slug ?? brand.slug,
        website: (patch.website ?? brand.website) || undefined,
      });
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-5">Marques</h1>

      <Card className="mb-5">
        <CardHeader><CardTitle>Ajouter une marque</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid sm:grid-cols-4 gap-3 items-end">
            <div className="flex flex-col gap-1.5">
              <Label>Nom</Label>
              <Input name="name" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>URL (slug)</Label>
              <Input name="slug" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Site web</Label>
              <Input name="website" type="url" placeholder="https://…" />
            </div>
            <Button type="submit" disabled={submitting}><Plus className="size-4" /> Ajouter</Button>
          </form>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive mb-3">{error}</p>}

      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Site web</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {brands?.map((b) => <BrandRow key={b.id} brand={b} onSave={handleRowSave} />)}
          </tbody>
        </table>
        {!brands && <p className="text-sm text-muted-foreground text-center py-10">Chargement…</p>}
      </div>
    </div>
  );
}

function BrandRow({ brand, onSave }: { brand: AdminBrand; onSave: (brand: AdminBrand, patch: Partial<AdminBrand>) => Promise<void> }) {
  const [name, setName] = useState(brand.name);
  const [slug, setSlug] = useState(brand.slug);
  const [website, setWebsite] = useState(brand.website ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await onSave(brand, { name, slug, website });
    setSaving(false);
  }

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-4 py-2.5"><Input value={name} onChange={(e) => setName(e.target.value)} className="w-40" /></td>
      <td className="px-4 py-2.5"><Input value={slug} onChange={(e) => setSlug(e.target.value)} className="w-40" /></td>
      <td className="px-4 py-2.5"><Input value={website} onChange={(e) => setWebsite(e.target.value)} type="url" className="w-52" /></td>
      <td className="px-4 py-2.5">
        <Button size="sm" variant="outline" onClick={save} disabled={saving}>{saving ? "…" : "Enregistrer"}</Button>
      </td>
    </tr>
  );
}
