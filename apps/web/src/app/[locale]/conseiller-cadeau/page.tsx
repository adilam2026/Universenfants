"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Gift, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { getProducts, type ProductSummary } from "@/lib/api";
import { ProductCard } from "@/components/product-card";

// Index 0 = "tous/toutes", pas de contrainte réelle envoyée à l'API — permet
// d'afficher une sélection dès l'arrivée sur la page sans forcer l'utilisateur
// à préciser un âge ou un budget avant de voir le moindre produit. Tranches
// alignées sur AGE_RANGES (product-filters.tsx) et AGE_TILES (accueil) — un
// référentiel d'âge différent par écran donnait l'impression de deux outils
// distincts qui ne se comprennent pas entre eux.
const AGE_OPTIONS = [
  { ageMin: undefined as number | undefined, ageMax: undefined as number | undefined },
  { ageMin: 0, ageMax: 2 },
  { ageMin: 3, ageMax: 5 },
  { ageMin: 6, ageMax: 8 },
  { ageMin: 9, ageMax: 12 },
  { ageMin: 12, ageMax: undefined as number | undefined },
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
  // -1 = aucune occasion sélectionnée (facultative — l'occasion ne filtre
  // jamais le catalogue, aucune donnée "occasion" n'existe côté produit ;
  // c'est un repère pour l'utilisateur, pas un critère de recherche réel).
  const [occasion, setOccasion] = useState(-1);
  const [showMoreOccasions, setShowMoreOccasions] = useState(false);
  const [results, setResults] = useState<ProductSummary[] | null>(null);
  const [widened, setWidened] = useState(false);
  const [loading, setLoading] = useState(false);

  const WHO_OPTIONS = [t("any"), t("boy"), t("girl")];
  const AGE_LABELS = [t("anyAge"), "0-2", "3-5", "6-8", "9-12", "12+"];
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
  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setWidened(false);
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
          if (cancelled) return;
          if (data.items.length > 0 || i === attempts.length - 1) {
            setResults(data.items);
            setWidened(i > 0 && data.items.length > 0);
            return;
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    // Recalcul automatique dès qu'un critère change (âge, budget, sexe) —
    // sans ça, changer un critère sans re-cliquer sur un bouton "Voir les
    // recommandations" laisse les anciens résultats affichés, ce qui donne
    // l'impression que le filtre ne fait rien. L'occasion est délibérément
    // absente des dépendances : elle ne filtre jamais la recherche (voir
    // commentaire sur `occasion` ci-dessus).
    const timer = setTimeout(run, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [who, ageIdx, budgetIdx]);

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
          <p className="text-xs font-bold text-muted-foreground mb-2">
            {t("occasion")} <span className="font-normal normal-case">({t("optional")})</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {MAIN_OCCASIONS.map((label, i) => (
              <Chip key={label} active={occasion === i} onClick={() => setOccasion(occasion === i ? -1 : i)}>
                {label}
              </Chip>
            ))}
            {showMoreOccasions &&
              MORE_OCCASIONS.map((label, i) => {
                const idx = MAIN_OCCASIONS.length + i;
                return (
                  <Chip key={label} active={occasion === idx} onClick={() => setOccasion(occasion === idx ? -1 : idx)}>
                    {label}
                  </Chip>
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
      </div>

      {results && (
        <div className="mt-6">
          <h2 className="font-display text-lg font-extrabold mb-1 flex items-center gap-2">
            {results.length === 0 ? t("noResults") : t("suggestions")}
            {loading && <span className="text-xs font-normal text-muted-foreground">{t("searching")}</span>}
          </h2>
          {widened && <p className="text-xs text-muted-foreground mb-3.5">{t("suggestionsWidened")}</p>}
          <div className={cn("grid grid-cols-2 lg:grid-cols-3 gap-3.5", !widened && "mt-3.5", loading && "opacity-60 transition-opacity")}>
            {results.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
