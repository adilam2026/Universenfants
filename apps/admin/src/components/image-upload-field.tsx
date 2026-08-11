"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";

// Un simple <input type="file"> se fond dans le formulaire (texte système
// minuscule, aucun repère visuel) — remplacé par une vraie zone cliquable
// grisée avec icône, pour qu'un champ d'upload d'image se voie au premier
// coup d'œil et affiche clairement le nom du fichier choisi.
export function ImageUploadField({
  label,
  hint,
  required,
  currentImageUrl,
  onChange,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  currentImageUrl?: string | null;
  onChange: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-muted-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-2.5 rounded-lg border-2 border-dashed border-input bg-secondary/70 hover:bg-secondary px-3 py-2.5 text-left transition-colors"
      >
        <Upload className="size-4 shrink-0 text-muted-foreground" />
        <span className="text-sm text-muted-foreground truncate">
          {fileName ?? (currentImageUrl ? "Remplacer l'image actuelle" : "Cliquer pour choisir un fichier")}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          setFileName(f?.name ?? null);
          onChange(f);
        }}
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
