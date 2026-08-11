"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Gift, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { getProducts, type ProductSummary } from "@/lib/api";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";

// Index 0 = "tous/toutes", pas de contrainte réelle envoyée à l'API — permet
// d'afficher une sélection dès l'arrivée sur la page sans forcer l'utilisateur
// à préciser un âge ou un budget avant de voir le moindre produit.
const AGE_OPTIONS = [
  { ageMin: undefined as number | undefined, ageMax: undefined as number | undefined },
  { ageMin: 0, ageMax: 2 },
  { ageMin: 3, ageMax: 5 },
  { ageMin: 6, ageMax: 8 },
  { ageMin: 9, ageMax: 12 },
];
const BUDGET_OPTIONS = [
  { priceMin: undefined as number | undefined, priceMax: undefined as number | undefined },
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
      aria-pressed={active}
      className={cn(
        "rounded-full border-2 px-3.5 py-1.5 text-xs font-bold transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        active
          ? "border-brand-primary-strong bg-brand-primary-strong text-white"
          : "border-border bg-transparent text-muted-foreground active:border-primary/60 md:hover:border-primary/40",
      )}
    >
      {children}
    </button>
  );
}

export default function GiftAdvisorPage() {
  const t = useTranslations("giftAdvisor");
  const [who, setWho] = useState(0);
  const [ageIdx, setAgeIdx] = useState(0);
  const [budgetIdx, setBudgetIdx] = useState(0);
  const [occasion, setOccasion] = useState(0);
  const [showMoreOccasions, setShowMoreOccasions] = useState(false);
  const [results, setResults] = useState<ProductSummary[] | null>(null);
  const [widened, setWidened] = useState(false);
  const [loading, setLoading] = useState(false);
  // Distingue la sélection par défaut (chargée automatiquement, avant toute
  // interaction) d'une recherche explicitement lancée par l'utilisateur — le
  // titre et le message affichés ne sont pas les mêmes dans les deux cas.
  const [hasSearched, setHasSearched] = useState(false);

  const WHO_OPTIONS = [t("any"), t("boy"), t("girl")];
  const AGE_LABELS = [t("anyAge"), "0-2", "3-5", "6-8", "9-12"];
  const BUDGET_LABELS = [t("anyBudget"), "< 100 DH", "100-300 DH", "300-500 DH", "500+ DH"];
  const MAIN_OCCASIONS = [t("birthday"), t("birth"), t("eid"), t("schoolSuccess")];
  const MORE_OCCASIONS = [t("christmas"), t("reward"), t("visit"), t("noOccasion"), t("otherOccasion")];

  // Une correspondance exacte (âge + budget + sexe) sur un catalogue de
  // taille modeste retombe souvent sur 0 résultat pour une sélection tout à
  // fait normale — sans repli, le Conseiller Cadeau paraît cassé. On
  // élargit donc progressivement (on ne garde que le premier niveau qui
  // renvoie au moins un produit) : jamais d'invention de compatibilité,
  // seulement les mêmes filtres réels du catalogue, appliqués avec moins de
  // contraintes à la fois. Avec les valeurs par défaut ("tous"), le premier
  // essai n'a déjà aucune contrainte réelle : la sélection par défaut au
  // chargement de la page passe par ce même mécanisme.
  async function runSearch(explicit: boolean) {
    setLoading(true);
    setWidened(false);
    if (explicit) setHasSearched(true);
    const age = AGE_OPTIONS[ageIdx];
    const budget = BUDGET_OPTIONS[budgetIdx];
    const gender = who === 1 ? "BOY" : who === 2 ? "GIRL" : undefined;

    const attempts: Record<string, string | number | boolean | undefined>[] = [
      { ageMin: age.ageMin, ageMax: age.ageMax, priceMin: budget.priceMin, priceMax: budget.priceMax, gender },
      { ageMin: age.ageMin, ageMax: age.ageMax, priceMin: budget.priceMin, priceMax: budget.priceMax },
      { ageMin: age.ageMin, ageMax: age.ageMax },
      { sort: "bestsellers" },
    ];

    try {
      for (let i = 0; i < attempts.length; i++) {
        const data = await getProducts({ ...attempts[i], limit: 8 });
        if (data.items.length > 0 || i === attempts.length - 1) {
          setResults(data.items);
          setWidened(i > 0 && data.items.length > 0);
          return;
        }
      }
    } finally {
      setLoading(false);
    }
  }

  // Sélection par défaut affichée dès l'arrivée sur la page, avant toute
  // interaction — le Conseiller Cadeau est un outil d'aide à l'achat, pas un
  // formulaire bloquant qui exige des réponses avant de montrer un seul jouet.
  useEffect(() => {
    runSearch(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            {MAIN_OCCASIONS.map((label, i) => (
              <Chip key={label} active={occasion === i} onClick={() => setOccasion(i)}>{label}</Chip>
            ))}
            {showMoreOccasions &&
              MORE_OCCASIONS.map((label, i) => {
                const idx = MAIN_OCCASIONS.length + i;
                return (
                  <Chip key={label} active={occasion === idx} onClick={() => setOccasion(idx)}>{label}</Chip>
                );
              })}
            <button
              type="button"
              onClick={() => setShowMoreOccasions((v) => !v)}
              className="rounded-full px-3.5 py-1.5 text-xs font-bold text-primary inline-flex items-center gap-1"
            >
              {showMoreOccasions ? t("fewerOccasions") : t("moreOccasions")}
              <ChevronDown className={cn("size-3.5 transition-transform", showMoreOccasions && "rotate-180")} />
            </button>
          </div>
        </div>
        <Button variant="cta" onClick={() => runSearch(true)} disabled={loading}>
          {loading ? t("searching") : t("seeResults")}
        </Button>
      </div>

      {results && (
        <div className="mt-6">
          <h2 className="font-display text-lg font-extrabold mb-1">
            {results.length === 0 ? t("noResults") : hasSearched ? t("suggestions") : t("defaultSuggestions")}
          </h2>
          {widened && <p className="text-xs text-muted-foreground mb-3.5">{t("suggestionsWidened")}</p>}
          <div className={cn("grid grid-cols-2 lg:grid-cols-3 gap-3.5", !widened && "mt-3.5")}>
            {results.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
