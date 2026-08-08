"use client";

import { useState } from "react";
import { Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import { getProducts, type ProductSummary } from "@/lib/api";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";

const WHO_OPTIONS = ["Garçon", "Fille", "Peu importe"];
const AGE_OPTIONS = [
  { label: "0-2 ans", ageMin: 0, ageMax: 2 },
  { label: "3-5 ans", ageMin: 3, ageMax: 5 },
  { label: "6-8 ans", ageMin: 6, ageMax: 8 },
  { label: "9-12 ans", ageMin: 9, ageMax: 12 },
];
const BUDGET_OPTIONS = [
  { label: "< 100 DH", priceMin: undefined as number | undefined, priceMax: 100 },
  { label: "100-300 DH", priceMin: 100, priceMax: 300 },
  { label: "300-500 DH", priceMin: 300, priceMax: 500 },
  { label: "500+ DH", priceMin: 500, priceMax: undefined as number | undefined },
];
const OCCASION_OPTIONS = ["Anniversaire", "Réussite scolaire", "Naissance", "Aïd"];

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border-2 px-3.5 py-1.5 text-xs font-bold transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-transparent text-muted-foreground hover:border-primary/40",
      )}
    >
      {children}
    </button>
  );
}

export default function GiftAdvisorPage() {
  const [who, setWho] = useState(0);
  const [ageIdx, setAgeIdx] = useState(1);
  const [budgetIdx, setBudgetIdx] = useState(1);
  const [occasion, setOccasion] = useState(0);
  const [results, setResults] = useState<ProductSummary[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    const age = AGE_OPTIONS[ageIdx];
    const budget = BUDGET_OPTIONS[budgetIdx];
    try {
      const data = await getProducts({
        ageMin: age.ageMin,
        ageMax: age.ageMax,
        priceMin: budget.priceMin,
        priceMax: budget.priceMax,
        limit: 8,
      });
      setResults(data.items);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 md:px-7 py-6">
      <div className="text-center mb-6">
        <Gift className="mx-auto size-10 text-brand-cta mb-2" />
        <h1 className="font-display text-2xl font-extrabold">Conseiller Cadeau</h1>
        <p className="text-sm text-muted-foreground mt-1">4 questions, une sélection de cadeaux adaptée en 30 secondes.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-5">
        <div>
          <p className="text-xs font-bold text-muted-foreground mb-2">Pour qui ?</p>
          <div className="flex flex-wrap gap-2">
            {WHO_OPTIONS.map((label, i) => (
              <Chip key={label} active={who === i} onClick={() => setWho(i)}>{label}</Chip>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold text-muted-foreground mb-2">Âge</p>
          <div className="flex flex-wrap gap-2">
            {AGE_OPTIONS.map((opt, i) => (
              <Chip key={opt.label} active={ageIdx === i} onClick={() => setAgeIdx(i)}>{opt.label}</Chip>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold text-muted-foreground mb-2">Budget</p>
          <div className="flex flex-wrap gap-2">
            {BUDGET_OPTIONS.map((opt, i) => (
              <Chip key={opt.label} active={budgetIdx === i} onClick={() => setBudgetIdx(i)}>{opt.label}</Chip>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold text-muted-foreground mb-2">Occasion</p>
          <div className="flex flex-wrap gap-2">
            {OCCASION_OPTIONS.map((label, i) => (
              <Chip key={label} active={occasion === i} onClick={() => setOccasion(i)}>{label}</Chip>
            ))}
          </div>
        </div>
        <Button variant="cta" onClick={handleSubmit} disabled={loading}>
          {loading ? "Recherche en cours…" : "Voir les recommandations"}
        </Button>
      </div>

      {results && (
        <div className="mt-6">
          <h2 className="font-display text-lg font-extrabold mb-3.5">
            {results.length > 0 ? "✨ Nos suggestions pour vous" : "Aucun résultat pour ces critères"}
          </h2>
          <div className="grid grid-cols-2 gap-3.5">
            {results.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
