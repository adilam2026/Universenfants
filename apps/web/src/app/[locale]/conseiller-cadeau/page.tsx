"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import { getProducts, type ProductSummary } from "@/lib/api";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";

const AGE_OPTIONS = [
  { ageMin: 0, ageMax: 2 },
  { ageMin: 3, ageMax: 5 },
  { ageMin: 6, ageMax: 8 },
  { ageMin: 9, ageMax: 12 },
];
const BUDGET_OPTIONS = [
  { priceMin: undefined as number | undefined, priceMax: 100 },
  { priceMin: 100, priceMax: 300 },
  { priceMin: 300, priceMax: 500 },
  { priceMin: 500, priceMax: undefined as number | undefined },
];

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
  const t = useTranslations("giftAdvisor");
  const [who, setWho] = useState(0);
  const [ageIdx, setAgeIdx] = useState(1);
  const [budgetIdx, setBudgetIdx] = useState(1);
  const [occasion, setOccasion] = useState(0);
  const [results, setResults] = useState<ProductSummary[] | null>(null);
  const [loading, setLoading] = useState(false);

  const WHO_OPTIONS = [t("boy"), t("girl"), t("any")];
  const AGE_LABELS = ["0-2", "3-5", "6-8", "9-12"];
  const BUDGET_LABELS = ["< 100 DH", "100-300 DH", "300-500 DH", "500+ DH"];
  const OCCASION_OPTIONS = [t("birthday"), t("schoolSuccess"), t("birth"), t("eid")];

  async function handleSubmit() {
    setLoading(true);
    const age = AGE_OPTIONS[ageIdx];
    const budget = BUDGET_OPTIONS[budgetIdx];
    const gender = who === 0 ? "BOY" : who === 1 ? "GIRL" : undefined;
    try {
      const data = await getProducts({
        ageMin: age.ageMin,
        ageMax: age.ageMax,
        priceMin: budget.priceMin,
        priceMax: budget.priceMax,
        gender,
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
        <h1 className="font-display text-2xl font-extrabold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-5">
        <div>
          <p className="text-xs font-bold text-muted-foreground mb-2">{t("forWhom")}</p>
          <div className="flex flex-wrap gap-2">
            {WHO_OPTIONS.map((label, i) => (
              <Chip key={label} active={who === i} onClick={() => setWho(i)}>{label}</Chip>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold text-muted-foreground mb-2">{t("age")}</p>
          <div className="flex flex-wrap gap-2">
            {AGE_LABELS.map((label, i) => (
              <Chip key={label} active={ageIdx === i} onClick={() => setAgeIdx(i)}>{label}</Chip>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold text-muted-foreground mb-2">{t("budget")}</p>
          <div className="flex flex-wrap gap-2">
            {BUDGET_LABELS.map((label, i) => (
              <Chip key={label} active={budgetIdx === i} onClick={() => setBudgetIdx(i)}>{label}</Chip>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold text-muted-foreground mb-2">{t("occasion")}</p>
          <div className="flex flex-wrap gap-2">
            {OCCASION_OPTIONS.map((label, i) => (
              <Chip key={label} active={occasion === i} onClick={() => setOccasion(i)}>{label}</Chip>
            ))}
          </div>
        </div>
        <Button variant="cta" onClick={handleSubmit} disabled={loading}>
          {loading ? t("searching") : t("seeResults")}
        </Button>
      </div>

      {results && (
        <div className="mt-6">
          <h2 className="font-display text-lg font-extrabold mb-3.5">
            {results.length > 0 ? t("suggestions") : t("noResults")}
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
