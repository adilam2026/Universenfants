"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

const SORTS = [
  { value: "relevance", label: "Pertinence" },
  { value: "price_asc", label: "Prix croissant" },
  { value: "price_desc", label: "Prix décroissant" },
  { value: "bestsellers", label: "Meilleures ventes" },
  { value: "newest", label: "Nouveautés" },
];

export function SortSelect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <select
      defaultValue={searchParams.get("sort") ?? "relevance"}
      className="rounded-full border border-border bg-card px-3.5 py-2 text-xs font-bold shrink-0"
      onChange={(e) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("sort", e.target.value);
        router.push(`?${params.toString()}`);
      }}
    >
      {SORTS.map((s) => (
        <option key={s.value} value={s.value}>
          Trier : {s.label}
        </option>
      ))}
    </select>
  );
}

export function FilterSidebar({ activeSlug, categories }: { activeSlug?: string; categories: { slug: string; nameFr: string; image: string | null }[] }) {
  return (
    <aside className="hidden md:block w-56 shrink-0 space-y-5">
      <div>
        <h4 className="text-sm font-bold mb-2.5">Univers</h4>
        <div className="flex flex-col gap-2">
          <Link href="/recherche" className={`text-sm ${!activeSlug ? "font-extrabold text-primary" : "text-muted-foreground"}`}>
            🧸 Tous les jouets
          </Link>
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/categorie/${c.slug}`}
              className={`text-sm ${activeSlug === c.slug ? "font-extrabold text-primary" : "text-muted-foreground"}`}
            >
              {c.image} {c.nameFr}
            </Link>
          ))}
        </div>
      </div>
      <div className="border-t border-border pt-4">
        <h4 className="text-sm font-bold mb-2.5">Âge</h4>
        <div className="flex flex-wrap gap-1.5">
          {["0-2", "3-5", "6-8", "9-12", "12+"].map((a) => (
            <span key={a} className="rounded-full border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground">
              {a}
            </span>
          ))}
        </div>
      </div>
      <div className="border-t border-border pt-4">
        <h4 className="text-sm font-bold mb-2.5">Disponibilité</h4>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" defaultChecked className="accent-primary" /> En stock uniquement
        </label>
      </div>
    </aside>
  );
}

export function MobileFilterButton() {
  return (
    <button className="md:hidden shrink-0 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-bold">☰ Filtrer</button>
  );
}
