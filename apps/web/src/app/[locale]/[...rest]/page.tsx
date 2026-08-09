import { notFound } from "next/navigation";

// Un chemin sans page correspondante sous /[locale]/* doit passer par le
// not-found.tsx localisé (FR/AR), pas par le fallback racine — sans ce
// catch-all, Next.js route les chemins vraiment non matchés vers le
// not-found.tsx de la racine (toujours en français, hors i18n).
export default function CatchAll(): never {
  notFound();
}
