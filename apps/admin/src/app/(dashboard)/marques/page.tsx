"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Plus, Archive } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listBrands, createBrand, updateBrand, archiveBrand, type AdminBrand } from "@/lib/catalog";
import { ApiError } from "@/lib/api-client";

const STATUS_LABEL: Record<AdminBrand["status"], string> = {
  DRAFT: "Brouillon",
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  ARCHIVED: "Archivée",
};

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
        status: patch.status ?? brand.status,
      });
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    }
  }

  async function handleArchive(brand: AdminBrand) {
    setError(null);
    try {
      await archiveBrand(brand.id);
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
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {brands?.map((b) => <BrandRow key={b.id} brand={b} onSave={handleRowSave} onArchive={handleArchive} />)}
          </tbody>
        </table>
        {!brands && <p className="text-sm text-muted-foreground text-center py-10">Chargement…</p>}
      </div>
    </div>
  );
}

function BrandRow({
  brand,
  onSave,
  onArchive,
}: {
  brand: AdminBrand;
  onSave: (brand: AdminBrand, patch: Partial<AdminBrand>) => Promise<void>;
  onArchive: (brand: AdminBrand) => Promise<void>;
}) {
  const [name, setName] = useState(brand.name);
  const [slug, setSlug] = useState(brand.slug);
  const [website, setWebsite] = useState(brand.website ?? "");
  const [status, setStatus] = useState(brand.status);
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);

  async function save() {
    setSaving(true);
    await onSave(brand, { name, slug, website, status });
    setSaving(false);
  }

  async function archive() {
    if (archiving) return;
    setArchiving(true);
    await onArchive(brand);
    setArchiving(false);
  }

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-4 py-2.5"><Input value={name} onChange={(e) => setName(e.target.value)} className="w-40" /></td>
      <td className="px-4 py-2.5"><Input value={slug} onChange={(e) => setSlug(e.target.value)} className="w-40" /></td>
      <td className="px-4 py-2.5"><Input value={website} onChange={(e) => setWebsite(e.target.value)} type="url" className="w-52" /></td>
      <td className="px-4 py-2.5">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as AdminBrand["status"])}
          className="h-9 rounded-md border border-border bg-background px-2 text-sm"
        >
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </td>
      <td className="px-4 py-2.5 flex gap-2">
        <Button size="sm" variant="outline" onClick={save} disabled={saving}>{saving ? "…" : "Enregistrer"}</Button>
        {brand.status !== "ARCHIVED" && (
          <Button size="sm" variant="ghost" onClick={archive} disabled={archiving} aria-label="Archiver">
            <Archive className="size-4" />
          </Button>
        )}
      </td>
    </tr>
  );
}
