"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { LandingPageBlock } from "@universenfants/shared";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const BLOCK_LABELS: Record<LandingPageBlock["type"], string> = {
  hero: "Hero (bannière)",
  gallery: "Galerie",
  description: "Description",
  advantages: "Avantages",
  testimonials: "Avis clients",
  faq: "FAQ",
  trust: "Réassurance",
};

function emptyBlock(type: LandingPageBlock["type"]): LandingPageBlock {
  switch (type) {
    case "hero":
      return { type, title: "", subtitle: "" };
    case "gallery":
      return { type, images: [] };
    case "description":
      return { type, text: "" };
    case "advantages":
      return { type, items: [] };
    case "testimonials":
      return { type, items: [] };
    case "faq":
      return { type, items: [] };
    case "trust":
      return { type, items: [] };
  }
}

function linesToList(text: string): string[] {
  return text.split("\n").map((l) => l.trim()).filter(Boolean);
}

export function LandingPageBlocksEditor({
  blocks,
  onChange,
}: {
  blocks: LandingPageBlock[];
  onChange: (blocks: LandingPageBlock[]) => void;
}) {
  function updateBlock(index: number, block: LandingPageBlock) {
    onChange(blocks.map((b, i) => (i === index ? block : b)));
  }
  function removeBlock(index: number) {
    onChange(blocks.filter((_, i) => i !== index));
  }
  function moveBlock(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }
  function addBlock(type: LandingPageBlock["type"]) {
    onChange([...blocks, emptyBlock(type)]);
  }

  return (
    <div className="flex flex-col gap-3.5">
      {blocks.map((block, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-3.5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold">{BLOCK_LABELS[block.type]}</span>
            <div className="flex gap-1">
              <Button type="button" size="sm" variant="outline" onClick={() => moveBlock(i, -1)} disabled={i === 0}>
                <ArrowUp className="size-3.5" />
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => moveBlock(i, 1)} disabled={i === blocks.length - 1}>
                <ArrowDown className="size-3.5" />
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => removeBlock(i)}>
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
          <BlockFields block={block} onChange={(b) => updateBlock(i, b)} />
        </div>
      ))}

      <div className="flex flex-wrap gap-2 pt-2">
        {(Object.keys(BLOCK_LABELS) as LandingPageBlock["type"][]).map((type) => (
          <Button key={type} type="button" size="sm" variant="outline" onClick={() => addBlock(type)}>
            <Plus className="size-3.5" /> {BLOCK_LABELS[type]}
          </Button>
        ))}
      </div>
    </div>
  );
}

function BlockFields({ block, onChange }: { block: LandingPageBlock; onChange: (b: LandingPageBlock) => void }) {
  switch (block.type) {
    case "hero":
      return (
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>Titre</Label>
            <Input value={block.title} onChange={(e) => onChange({ ...block, title: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>Sous-titre</Label>
            <Input value={block.subtitle ?? ""} onChange={(e) => onChange({ ...block, subtitle: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Image de bannière (URL)</Label>
            <Input value={block.bannerUrl ?? ""} onChange={(e) => onChange({ ...block, bannerUrl: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Vidéo (URL, optionnel)</Label>
            <Input value={block.videoUrl ?? ""} onChange={(e) => onChange({ ...block, videoUrl: e.target.value })} />
          </div>
        </div>
      );
    case "gallery":
      return (
        <div className="flex flex-col gap-1.5">
          <Label>Images (une URL par ligne)</Label>
          <textarea
            className="rounded-md border border-input bg-transparent px-3 py-2 text-sm min-h-24"
            value={block.images.join("\n")}
            onChange={(e) => onChange({ ...block, images: linesToList(e.target.value) })}
          />
        </div>
      );
    case "description":
      return (
        <div className="flex flex-col gap-1.5">
          <Label>Texte</Label>
          <textarea
            className="rounded-md border border-input bg-transparent px-3 py-2 text-sm min-h-24"
            value={block.text}
            onChange={(e) => onChange({ ...block, text: e.target.value })}
          />
        </div>
      );
    case "advantages":
      return (
        <div className="flex flex-col gap-1.5">
          <Label>Avantages (un par ligne)</Label>
          <textarea
            className="rounded-md border border-input bg-transparent px-3 py-2 text-sm min-h-24"
            placeholder={"Facile à utiliser\nProduit sécurisé\nLivraison rapide"}
            value={block.items.join("\n")}
            onChange={(e) => onChange({ ...block, items: linesToList(e.target.value) })}
          />
        </div>
      );
    case "trust":
      return (
        <div className="flex flex-col gap-1.5">
          <Label>Éléments de réassurance (un par ligne)</Label>
          <textarea
            className="rounded-md border border-input bg-transparent px-3 py-2 text-sm min-h-24"
            value={block.items.join("\n")}
            onChange={(e) => onChange({ ...block, items: linesToList(e.target.value) })}
          />
        </div>
      );
    case "testimonials":
      return (
        <div className="flex flex-col gap-2.5">
          {block.items.map((item, i) => (
            <div key={i} className="grid sm:grid-cols-[1fr_1fr_80px_2fr_auto] gap-2 items-end">
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Prénom</Label>
                <Input
                  value={item.name}
                  onChange={(e) => {
                    const items = [...block.items];
                    items[i] = { ...item, name: e.target.value };
                    onChange({ ...block, items });
                  }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Photo (URL, optionnel)</Label>
                <Input
                  value={item.photoUrl ?? ""}
                  onChange={(e) => {
                    const items = [...block.items];
                    items[i] = { ...item, photoUrl: e.target.value || undefined };
                    onChange({ ...block, items });
                  }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Note</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                  value={item.rating}
                  onChange={(e) => {
                    const items = [...block.items];
                    items[i] = { ...item, rating: Number(e.target.value) };
                    onChange({ ...block, items });
                  }}
                >
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>{n}★</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Commentaire</Label>
                <Input
                  value={item.comment}
                  onChange={(e) => {
                    const items = [...block.items];
                    items[i] = { ...item, comment: e.target.value };
                    onChange({ ...block, items });
                  }}
                />
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => onChange({ ...block, items: block.items.filter((_, j) => j !== i) })}>
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="self-start"
            onClick={() => onChange({ ...block, items: [...block.items, { name: "", rating: 5, comment: "" }] })}
          >
            <Plus className="size-3.5" /> Ajouter un avis
          </Button>
        </div>
      );
    case "faq":
      return (
        <div className="flex flex-col gap-2.5">
          {block.items.map((item, i) => (
            <div key={i} className="grid sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Question</Label>
                <Input
                  value={item.question}
                  onChange={(e) => {
                    const items = [...block.items];
                    items[i] = { ...item, question: e.target.value };
                    onChange({ ...block, items });
                  }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Réponse</Label>
                <Input
                  value={item.answer}
                  onChange={(e) => {
                    const items = [...block.items];
                    items[i] = { ...item, answer: e.target.value };
                    onChange({ ...block, items });
                  }}
                />
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => onChange({ ...block, items: block.items.filter((_, j) => j !== i) })}>
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="self-start"
            onClick={() => onChange({ ...block, items: [...block.items, { question: "", answer: "" }] })}
          >
            <Plus className="size-3.5" /> Ajouter une question
          </Button>
        </div>
      );
  }
}
