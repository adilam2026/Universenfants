"use client";

import { useState, type FormEvent } from "react";
import useSWR from "swr";
import Image from "next/image";
import { Plus, Trash2, Pencil, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardSkeleton } from "@/components/ui/skeleton";
import { ImageUploadField } from "@/components/image-upload-field";
import {
  listHeroBanners,
  createHeroBanner,
  updateHeroBanner,
  removeHeroBanner,
  type AdminHeroBanner,
} from "@/lib/hero-banners";

const STATUS_LABEL: Record<AdminHeroBanner["status"], string> = {
  DRAFT: "Brouillon",
  SCHEDULED: "Programmée",
  ACTIVE: "Active",
  ENDED: "Terminée",
};

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export default function HeroBannersPage() {
  const { data: banners, mutate: refresh } = useSWR<AdminHeroBanner[]>("/hero-banners", listHeroBanners);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [fileDesktop, setFileDesktop] = useState<File | null>(null);
  const [fileMobile, setFileMobile] = useState<File | null>(null);
  // Remonte les deux ImageUploadField (donc réinitialise leur état interne
  // "fichier choisi") après un ajout réussi, sans avoir besoin d'une API
  // de reset impérative.
  const [createFormKey, setCreateFormKey] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!fileDesktop) {
      setError("Une image desktop est requise");
      return;
    }
    setError(null);
    setCreating(true);
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    try {
      await createHeroBanner(
        {
          titleFr: String(form.get("titleFr")),
          titleAr: String(form.get("titleAr") || "") || undefined,
          subtitleFr: String(form.get("subtitleFr") || "") || undefined,
          subtitleAr: String(form.get("subtitleAr") || "") || undefined,
          link: String(form.get("link") || "") || undefined,
          status: "ACTIVE",
        },
        fileDesktop,
        fileMobile,
      );
      formEl.reset();
      setFileDesktop(null);
      setFileMobile(null);
      setCreateFormKey((k) => k + 1);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setCreating(false);
    }
  }

  async function handleRemove(id: string) {
    setError(null);
    try {
      await removeHeroBanner(id);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    }
  }

  async function handleStatusToggle(banner: AdminHeroBanner) {
    setError(null);
    try {
      await updateHeroBanner(banner.id, { titleFr: banner.titleFr, status: banner.status === "ACTIVE" ? "DRAFT" : "ACTIVE" });
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Bannières homepage</h1>
      <p className="text-sm text-muted-foreground mb-5">Pilotent le carrousel en haut de la page d&apos;accueil du site. Seules les bannières « Active » s&apos;affichent.</p>

      <Card className="mb-5">
        <CardHeader><CardTitle>Ajouter une bannière</CardTitle></CardHeader>
        <CardContent>
          <form key={createFormKey} onSubmit={handleCreate} className="flex flex-col gap-3.5">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Titre (FR)</Label>
                <Input name="titleFr" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Titre (AR)</Label>
                <Input name="titleAr" dir="rtl" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Sous-titre (FR)</Label>
                <Input name="subtitleFr" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Sous-titre (AR)</Label>
                <Input name="subtitleAr" dir="rtl" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Lien (au clic)</Label>
                <Input name="link" placeholder="/categorie/construction" />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <ImageUploadField
                label="Image desktop (recommandé : 1600×340px, ratio ~4.7:1)"
                required
                onChange={setFileDesktop}
              />
              <ImageUploadField
                label="Image mobile (recommandé : 800×500px, ratio ~1.6:1 — optionnel)"
                hint="Si vide, l'image desktop est réutilisée (recadrée) sur mobile."
                onChange={setFileMobile}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={creating} className="w-fit"><Plus className="size-4" /> Ajouter</Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        {banners?.map((b) =>
          editingId === b.id ? (
            <BannerEditForm
              key={b.id}
              banner={b}
              onCancel={() => setEditingId(null)}
              onSaved={() => {
                setEditingId(null);
                refresh();
              }}
            />
          ) : (
            <Card key={b.id}>
              <CardContent className="p-3.5 flex items-center gap-3.5">
                <div className="relative size-16 shrink-0 rounded-lg overflow-hidden bg-secondary">
                  <Image src={b.imageDesktop} alt="" fill sizes="64px" className="object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{b.titleFr}</p>
                  <p className="text-xs text-muted-foreground truncate">{b.subtitleFr}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {b.imageMobile === b.imageDesktop ? "Même image desktop/mobile" : "Image mobile dédiée"}
                    {(b.startAt || b.endAt) && (
                      <>
                        {" · "}
                        {b.startAt ? new Date(b.startAt).toLocaleDateString("fr-FR") : "…"}
                        {" → "}
                        {b.endAt ? new Date(b.endAt).toLocaleDateString("fr-FR") : "…"}
                      </>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => handleStatusToggle(b)}
                  className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${b.status === "ACTIVE" ? "bg-brand-success/15 text-brand-success" : "bg-secondary text-muted-foreground"}`}
                >
                  {STATUS_LABEL[b.status]}
                </button>
                <Button size="sm" variant="ghost" onClick={() => setEditingId(b.id)} aria-label="Modifier">
                  <Pencil className="size-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleRemove(b.id)} aria-label="Supprimer">
                  <Trash2 className="size-4" />
                </Button>
              </CardContent>
            </Card>
          ),
        )}
        {banners && banners.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Aucune bannière — la page d&apos;accueil affiche le carrousel par défaut.</p>}
        {!banners && <Card><CardSkeleton lines={3} /></Card>}
      </div>
    </div>
  );
}

function BannerEditForm({
  banner,
  onCancel,
  onSaved,
}: {
  banner: AdminHeroBanner;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [fileDesktop, setFileDesktop] = useState<File | null>(null);
  const [fileMobile, setFileMobile] = useState<File | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const form = new FormData(e.currentTarget);
    try {
      // Contrairement au formulaire de création, on envoie ici la valeur
      // réelle de chaque champ (même vide) plutôt que de convertir "vide"
      // en `undefined` — un sous-titre ou une date effacés dans le
      // formulaire doivent effacer la valeur en base, pas être ignorés.
      await updateHeroBanner(
        banner.id,
        {
          titleFr: String(form.get("titleFr") ?? ""),
          titleAr: String(form.get("titleAr") ?? ""),
          subtitleFr: String(form.get("subtitleFr") ?? ""),
          subtitleAr: String(form.get("subtitleAr") ?? ""),
          link: String(form.get("link") ?? ""),
          startAt: String(form.get("startAt") ?? ""),
          endAt: String(form.get("endAt") ?? ""),
          status: banner.status,
        },
        fileDesktop,
        fileMobile,
      );
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-primary">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Modifier la bannière</CardTitle>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} aria-label="Fermer">
          <X className="size-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Titre (FR)</Label>
              <Input name="titleFr" defaultValue={banner.titleFr} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Titre (AR)</Label>
              <Input name="titleAr" dir="rtl" defaultValue={banner.titleAr ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Sous-titre (FR)</Label>
              <Input name="subtitleFr" defaultValue={banner.subtitleFr ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Sous-titre (AR)</Label>
              <Input name="subtitleAr" dir="rtl" defaultValue={banner.subtitleAr ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Lien (au clic)</Label>
              <Input name="link" defaultValue={banner.link ?? ""} placeholder="/categorie/construction" />
            </div>
            <div />
            <div className="flex flex-col gap-1.5">
              <Label>Début de validité (optionnel)</Label>
              <Input name="startAt" type="date" defaultValue={toDateInputValue(banner.startAt)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Fin de validité (optionnel)</Label>
              <Input name="endAt" type="date" defaultValue={toDateInputValue(banner.endAt)} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <ImageUploadField
              label="Image desktop"
              hint="Laisser vide pour garder l'image actuelle."
              currentImageUrl={banner.imageDesktop}
              onChange={setFileDesktop}
            />
            <ImageUploadField
              label="Image mobile"
              hint="Laisser vide pour garder l'image actuelle."
              currentImageUrl={banner.imageMobile}
              onChange={setFileMobile}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={saving} className="w-fit">{saving ? "Enregistrement…" : "Enregistrer"}</Button>
            <Button type="button" variant="outline" onClick={onCancel} className="w-fit">Annuler</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
