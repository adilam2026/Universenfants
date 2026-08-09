"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Trash2, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { uploadProductImage, removeProductImage, reorderProductImages, type AdminProductImage } from "@/lib/products";

export function ProductImagesCard({
  productId,
  images,
  onChanged,
}: {
  productId: string;
  images: AdminProductImage[];
  onChanged: (images: AdminProductImage[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const updated = await uploadProductImage(productId, file);
      onChanged(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove(imageId: string, index: number) {
    // Aucune confirmation n'existait, y compris pour l'image de couverture
    // (index 0) ou la dernière image restante — un clic malheureux laissait
    // le produit sans aucune image, sans avertissement.
    const label = index === 0 && images.length > 1 ? "l'image principale" : images.length === 1 ? "la seule image du produit" : "cette image";
    if (!window.confirm(`Supprimer ${label} ? Cette action est irréversible.`)) return;
    try {
      const updated = await removeProductImage(productId, imageId);
      onChanged(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const previous = images;
    const next = [...images];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChanged(next);
    try {
      await reorderProductImages(productId, next.map((i) => i.id));
    } catch (err) {
      // Sans ce retour en arrière, un échec réseau laissait l'ordre affiché
      // désynchronisé de l'ordre réel côté serveur jusqu'au prochain
      // rechargement complet de la page.
      onChanged(previous);
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Images</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-3">
        {images.length === 0 && <p className="text-xs text-muted-foreground">Aucune image pour ce produit.</p>}
        <div className="grid grid-cols-3 gap-2">
          {images.map((img, i) => (
            <div key={img.id} className="relative rounded-md border border-border overflow-hidden group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.thumbnailUrl ?? img.url} alt="" className="aspect-square w-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="flex size-6 items-center justify-center rounded bg-white/90 text-foreground disabled:opacity-30">
                  <ArrowLeft className="size-3.5" />
                </button>
                <button type="button" onClick={() => handleRemove(img.id, i)} className="flex size-6 items-center justify-center rounded bg-white/90 text-destructive">
                  <Trash2 className="size-3.5" />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === images.length - 1} className="flex size-6 items-center justify-center rounded bg-white/90 text-foreground disabled:opacity-30">
                  <ArrowRight className="size-3.5" />
                </button>
              </div>
              {i === 0 && <span className="absolute top-1 left-1 rounded bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">Principale</span>}
            </div>
          ))}
        </div>
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
          <Upload className="size-4" /> {uploading ? "Envoi…" : "Ajouter une image"}
        </Button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
