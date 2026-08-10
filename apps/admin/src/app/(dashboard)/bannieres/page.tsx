"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export default function HeroBannersPage() {
  const [banners, setBanners] = useState<AdminHeroBanner[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);

  function refresh() {
    listHeroBanners().then(setBanners);
  }
  useEffect(refresh, []);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) {
      setError("Une image est requise");
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
          link: String(form.get("link") || "") || undefined,
          status: "ACTIVE",
        },
        file,
      );
      formEl.reset();
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
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
          <form onSubmit={handleCreate} className="flex flex-col gap-3.5">
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
                <Label>Sous-titre</Label>
                <Input name="subtitleFr" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Lien (au clic)</Label>
                <Input name="link" placeholder="/categorie/construction" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Image (recommandé : 1600×500px environ)</Label>
              <input ref={inputRef} type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={creating} className="w-fit"><Plus className="size-4" /> Ajouter</Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        {banners?.map((b) => (
          <Card key={b.id}>
            <CardContent className="p-3.5 flex items-center gap-3.5">
              <div className="relative size-16 shrink-0 rounded-lg overflow-hidden bg-secondary">
                <Image src={b.imageDesktop} alt="" fill sizes="64px" className="object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{b.titleFr}</p>
                <p className="text-xs text-muted-foreground truncate">{b.subtitleFr}</p>
              </div>
              <button
                onClick={() => handleStatusToggle(b)}
                className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${b.status === "ACTIVE" ? "bg-brand-success/15 text-brand-success" : "bg-secondary text-muted-foreground"}`}
              >
                {STATUS_LABEL[b.status]}
              </button>
              <Button size="sm" variant="ghost" onClick={() => handleRemove(b.id)} aria-label="Supprimer">
                <Trash2 className="size-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
        {banners && banners.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Aucune bannière — la page d&apos;accueil affiche le carrousel par défaut.</p>}
        {!banners && <p className="text-sm text-muted-foreground">Chargement…</p>}
      </div>
    </div>
  );
}
