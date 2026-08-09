"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Plus, Archive } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listCategories, createCategory, updateCategory, archiveCategory, type AdminCategory } from "@/lib/catalog";
import { ApiError } from "@/lib/api-client";

const STATUS_LABEL: Record<AdminCategory["status"], string> = {
  DRAFT: "Brouillon",
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  ARCHIVED: "Archivée",
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<AdminCategory[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function refresh() {
    listCategories().then(setCategories);
  }
  useEffect(refresh, []);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    try {
      await createCategory({
        nameFr: String(form.get("nameFr")),
        nameAr: String(form.get("nameAr") || "") || undefined,
        slug: String(form.get("slug")),
        parentId: String(form.get("parentId") || "") || undefined,
      });
      formEl.reset();
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRowSave(category: AdminCategory, patch: Partial<AdminCategory>) {
    try {
      await updateCategory(category.id, {
        nameFr: patch.nameFr ?? category.nameFr,
        nameAr: (patch.nameAr ?? category.nameAr) || undefined,
        slug: patch.slug ?? category.slug,
        parentId: (patch.parentId ?? category.parentId) || undefined,
        status: patch.status ?? category.status,
      });
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    }
  }

  async function handleArchive(category: AdminCategory) {
    setError(null);
    try {
      await archiveCategory(category.id);
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-5">Catégories</h1>

      <Card className="mb-5">
        <CardHeader><CardTitle>Ajouter une catégorie</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid sm:grid-cols-4 gap-3 items-end">
            <div className="flex flex-col gap-1.5">
              <Label>Nom (FR)</Label>
              <Input name="nameFr" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Nom (AR)</Label>
              <Input name="nameAr" dir="rtl" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>URL (slug)</Label>
              <Input name="slug" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Catégorie parente</Label>
              <select name="parentId" className="h-9 rounded-md border border-border bg-background px-3 text-sm">
                <option value="">Aucune (racine)</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>{c.nameFr}</option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={submitting} className="sm:col-span-4 w-fit">
              <Plus className="size-4" /> Ajouter
            </Button>
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
              <th className="px-4 py-3">Parente</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {categories?.map((c) => (
              <CategoryRow key={c.id} category={c} all={categories} onSave={handleRowSave} onArchive={handleArchive} />
            ))}
          </tbody>
        </table>
        {!categories && <p className="text-sm text-muted-foreground text-center py-10">Chargement…</p>}
      </div>
    </div>
  );
}

function CategoryRow({
  category,
  all,
  onSave,
  onArchive,
}: {
  category: AdminCategory;
  all: AdminCategory[];
  onSave: (category: AdminCategory, patch: Partial<AdminCategory>) => Promise<void>;
  onArchive: (category: AdminCategory) => Promise<void>;
}) {
  const [nameFr, setNameFr] = useState(category.nameFr);
  const [slug, setSlug] = useState(category.slug);
  const [parentId, setParentId] = useState(category.parentId ?? "");
  const [status, setStatus] = useState(category.status);
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);

  async function save() {
    setSaving(true);
    await onSave(category, { nameFr, slug, parentId: parentId || null, status });
    setSaving(false);
  }

  async function archive() {
    if (archiving) return;
    setArchiving(true);
    await onArchive(category);
    setArchiving(false);
  }

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-4 py-2.5"><Input value={nameFr} onChange={(e) => setNameFr(e.target.value)} className="w-40" /></td>
      <td className="px-4 py-2.5"><Input value={slug} onChange={(e) => setSlug(e.target.value)} className="w-40" /></td>
      <td className="px-4 py-2.5">
        <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="h-9 rounded-md border border-border bg-background px-2 text-sm">
          <option value="">Aucune</option>
          {all.filter((c) => c.id !== category.id).map((c) => (
            <option key={c.id} value={c.id}>{c.nameFr}</option>
          ))}
        </select>
      </td>
      <td className="px-4 py-2.5">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as AdminCategory["status"])}
          className="h-9 rounded-md border border-border bg-background px-2 text-sm"
        >
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </td>
      <td className="px-4 py-2.5 flex gap-2">
        <Button size="sm" variant="outline" onClick={save} disabled={saving}>{saving ? "…" : "Enregistrer"}</Button>
        {category.status !== "ARCHIVED" && (
          <Button size="sm" variant="ghost" onClick={archive} disabled={archiving} aria-label="Archiver">
            <Archive className="size-4" />
          </Button>
        )}
      </td>
    </tr>
  );
}
