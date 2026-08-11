"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { X, Check } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { localized } from "@/lib/localized";
import { cn } from "@/lib/utils";

const SORT_VALUES = ["relevance", "price_asc", "price_desc", "bestsellers", "newest"] as const;

const AGE_RANGES: { label: string; ageMin?: number; ageMax?: number }[] = [
  { label: "0-2", ageMin: 0, ageMax: 2 },
  { label: "3-5", ageMin: 3, ageMax: 5 },
  { label: "6-8", ageMin: 6, ageMax: 8 },
  { label: "9-12", ageMin: 9, ageMax: 12 },
  { label: "12+", ageMin: 12 },
];

const PRICE_RANGES: { label: string; priceMin?: number; priceMax?: number }[] = [
  { label: "< 100 DH", priceMax: 100 },
  { label: "100-300 DH", priceMin: 100, priceMax: 300 },
  { label: "300-500 DH", priceMin: 300, priceMax: 500 },
  { label: "500+ DH", priceMin: 500 },
];

// Fond violet foncé (charte) + texte blanc + coche : le token --primary de
// base (#8172d6) offrait un contraste insuffisant entre un chip actif et un
// chip inactif pour être identifiable en un coup d'œil — --brand-primary-strong
// est délibérément plus saturé/foncé, réservé aux états "sélectionné".
function chipClass(active: boolean) {
  return cn(
    "rounded-full border-2 px-3 py-1.5 text-xs font-bold transition-colors inline-flex items-center gap-1",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    active
      ? "border-brand-primary-strong bg-brand-primary-strong text-white"
      : "border-border text-muted-foreground active:border-primary/60 md:hover:border-primary/40",
  );
}

// MobileFilterButton et FilterSidebar sont rendus comme deux composants
// frères dans les pages qui les utilisent (aucun état partagé possible via
// les props) — on relie donc le bouton mobile à l'ouverture du tiroir via un
// événement window, même mécanisme que CART_UPDATED_EVENT/WISHLIST_UPDATED_EVENT
// ailleurs dans le code. Sans ça, "Filtrer" sur mobile n'ouvrait rien : c'est
// le seul moyen de filtrer par catégorie sur mobile, la sidebar étant
// `hidden md:block`.
const TOGGLE_MOBILE_FILTERS_EVENT = "toggle-mobile-filters";

export function SortSelect() {
  const t = useTranslations("filters");
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
      {SORT_VALUES.map((v) => (
        <option key={v} value={v}>
          {t("sortBy")} {t(`sort.${v}`)}
        </option>
      ))}
    </select>
  );
}

interface FilterCategory {
  slug: string;
  nameFr: string;
  nameAr?: string | null;
  image: string | null;
  children?: FilterCategory[];
}

function useFilterParams() {
  const searchParams = useSearchParams();
  const router = useRouter();

  function updateParams(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === undefined) params.delete(key);
      else params.set(key, value);
    }
    router.push(`?${params.toString()}`, { scroll: false });
  }

  return { searchParams, updateParams };
}

function FilterContent({
  activeSlug,
  categories,
}: {
  activeSlug?: string;
  categories: FilterCategory[];
}) {
  const t = useTranslations("filters");
  const locale = useLocale();
  const { searchParams, updateParams } = useFilterParams();

  const activeAgeMin = searchParams.get("ageMin");
  const activeAgeMax = searchParams.get("ageMax");
  const activePriceMin = searchParams.get("priceMin");
  const activePriceMax = searchParams.get("priceMax");
  const inStockOnly = searchParams.get("inStock") === "1";
  const promoOnly = searchParams.get("promo") === "1";

  function toggleAge(range: (typeof AGE_RANGES)[number]) {
    const isActive = String(range.ageMin ?? "") === (activeAgeMin ?? "") && String(range.ageMax ?? "") === (activeAgeMax ?? "") && activeAgeMin !== null;
    updateParams({
      ageMin: isActive ? undefined : range.ageMin !== undefined ? String(range.ageMin) : undefined,
      ageMax: isActive ? undefined : range.ageMax !== undefined ? String(range.ageMax) : undefined,
    });
  }

  function togglePrice(range: (typeof PRICE_RANGES)[number]) {
    const isActive =
      String(range.priceMin ?? "") === (activePriceMin ?? "") && String(range.priceMax ?? "") === (activePriceMax ?? "") && activePriceMin !== null;
    updateParams({
      priceMin: isActive ? undefined : range.priceMin !== undefined ? String(range.priceMin) : undefined,
      priceMax: isActive ? undefined : range.priceMax !== undefined ? String(range.priceMax) : undefined,
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-sm font-bold mb-2.5">{t("universe")}</h4>
        <div className="flex flex-col gap-2">
          <Link href="/recherche" className={`text-sm ${!activeSlug ? "font-extrabold text-primary" : "text-muted-foreground"}`}>
            {t("allToys")}
          </Link>
          {categories.map((c) => {
            const childActive = c.children?.some((child) => child.slug === activeSlug) ?? false;
            return (
              <div key={c.slug}>
                <Link
                  href={`/categorie/${c.slug}`}
                  className={`text-sm ${activeSlug === c.slug ? "font-extrabold text-primary" : "text-muted-foreground"}`}
                >
                  {c.image} {localized(c.nameFr, c.nameAr, locale)}
                </Link>
                {/* Sous-catégories : repliées sauf quand l'une d'elles (ou leur
                    parent) est la page courante — sinon elles n'ont aucun point
                    d'entrée navigable malgré leur indexation dans le sitemap. */}
                {(activeSlug === c.slug || childActive) && c.children && c.children.length > 0 && (
                  <div className="flex flex-col gap-1.5 mt-1.5 ms-4 border-s border-border ps-3">
                    {c.children.map((child) => (
                      <Link
                        key={child.slug}
                        href={`/categorie/${child.slug}`}
                        className={`text-sm ${activeSlug === child.slug ? "font-extrabold text-primary" : "text-muted-foreground"}`}
                      >
                        {localized(child.nameFr, child.nameAr, locale)}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="border-t border-border pt-4">
        <h4 className="text-sm font-bold mb-2.5">{t("age")}</h4>
        <div className="flex flex-wrap gap-1.5">
          {AGE_RANGES.map((range) => {
            const active = String(range.ageMin ?? "") === (activeAgeMin ?? "") && String(range.ageMax ?? "") === (activeAgeMax ?? "") && activeAgeMin !== null;
            return (
              <button key={range.label} type="button" onClick={() => toggleAge(range)} className={chipClass(active)}>
                {active && <Check className="size-3" />}
                {range.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="border-t border-border pt-4">
        <h4 className="text-sm font-bold mb-2.5">{t("price")}</h4>
        <div className="flex flex-wrap gap-1.5">
          {PRICE_RANGES.map((range) => {
            const active =
              String(range.priceMin ?? "") === (activePriceMin ?? "") && String(range.priceMax ?? "") === (activePriceMax ?? "") && activePriceMin !== null;
            return (
              <button key={range.label} type="button" onClick={() => togglePrice(range)} className={chipClass(active)}>
                {active && <Check className="size-3" />}
                {range.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="border-t border-border pt-4">
        <h4 className="text-sm font-bold mb-2.5">{t("availability")}</h4>
        <button
          type="button"
          role="checkbox"
          aria-checked={inStockOnly}
          onClick={() => updateParams({ inStock: inStockOnly ? undefined : "1" })}
          className={chipClass(inStockOnly)}
        >
          {inStockOnly && <Check className="size-3" />}
          {t("inStockOnly")}
        </button>
      </div>
      <div className="border-t border-border pt-4">
        <button
          type="button"
          role="checkbox"
          aria-checked={promoOnly}
          onClick={() => updateParams({ promo: promoOnly ? undefined : "1" })}
          className={chipClass(promoOnly)}
        >
          {promoOnly && <Check className="size-3" />}
          {t("promotionsOnly")}
        </button>
      </div>
    </div>
  );
}

export function FilterSidebar({ activeSlug, categories }: { activeSlug?: string; categories: { slug: string; nameFr: string; nameAr?: string | null; image: string | null }[] }) {
  const t = useTranslations("filters");
  const tNav = useTranslations("nav");
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleToggle() {
      setMobileOpen((v) => !v);
    }
    window.addEventListener(TOGGLE_MOBILE_FILTERS_EVENT, handleToggle);
    return () => window.removeEventListener(TOGGLE_MOBILE_FILTERS_EVENT, handleToggle);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    closeButtonRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  return (
    <>
      <aside className="hidden md:block w-60 xl:w-64 shrink-0">
        <FilterContent activeSlug={activeSlug} categories={categories} />
      </aside>

      <div
        className={cn(
          "fixed inset-0 z-[60] bg-foreground/40 transition-opacity md:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setMobileOpen(false)}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t("filter")}
        className={cn(
          "fixed inset-y-0 start-0 z-[61] w-[82%] max-w-80 overflow-y-auto bg-card p-4 shadow-xl transition-transform md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full",
        )}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold">{t("filter")}</h3>
          <button
            ref={closeButtonRef}
            className="flex size-9 items-center justify-center rounded-full hover:bg-secondary"
            aria-label={tNav("close")}
            onClick={() => setMobileOpen(false)}
          >
            <X className="size-5" />
          </button>
        </div>
        <FilterContent activeSlug={activeSlug} categories={categories} />
      </aside>
    </>
  );
}

export function MobileFilterButton() {
  const t = useTranslations("filters");
  const { searchParams } = useFilterParams();
  const activeCount = countActiveFilters(searchParams);
  return (
    <button
      className="md:hidden shrink-0 relative rounded-full border border-border bg-card px-3.5 py-2 text-xs font-bold"
      onClick={() => window.dispatchEvent(new Event(TOGGLE_MOBILE_FILTERS_EVENT))}
    >
      {t("filter")}
      {activeCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 rtl:right-auto rtl:-left-1.5 flex size-4 items-center justify-center rounded-full bg-brand-cta text-[10px] font-bold text-brand-cta-foreground">
          {activeCount}
        </span>
      )}
    </button>
  );
}

function countActiveFilters(searchParams: URLSearchParams) {
  let count = 0;
  if (searchParams.get("ageMin") !== null || searchParams.get("ageMax") !== null) count++;
  if (searchParams.get("priceMin") !== null || searchParams.get("priceMax") !== null) count++;
  if (searchParams.get("inStock") === "1") count++;
  if (searchParams.get("promo") === "1") count++;
  return count;
}

// Barre de filtres actifs affichée au-dessus de la grille de résultats : sans
// elle, retirer un seul filtre (ex: juste le prix, en gardant l'âge) obligeait
// à rouvrir tout le panneau et à deviner lequel était actif — chaque filtre
// n'avait aucun état visible en dehors de son propre contrôle.
export function ActiveFiltersBar() {
  const t = useTranslations("filters");
  const { searchParams, updateParams } = useFilterParams();

  const ageMin = searchParams.get("ageMin");
  const ageMax = searchParams.get("ageMax");
  const priceMin = searchParams.get("priceMin");
  const priceMax = searchParams.get("priceMax");
  const inStockOnly = searchParams.get("inStock") === "1";
  const promoOnly = searchParams.get("promo") === "1";

  const pills: { key: string; label: string; clear: Record<string, undefined> }[] = [];
  if (ageMin !== null || ageMax !== null) {
    const range = AGE_RANGES.find((r) => String(r.ageMin ?? "") === (ageMin ?? "") && String(r.ageMax ?? "") === (ageMax ?? ""));
    pills.push({ key: "age", label: `${t("age")} : ${range?.label ?? `${ageMin ?? "0"}-${ageMax ?? "+"}`}`, clear: { ageMin: undefined, ageMax: undefined } });
  }
  if (priceMin !== null || priceMax !== null) {
    const range = PRICE_RANGES.find((r) => String(r.priceMin ?? "") === (priceMin ?? "") && String(r.priceMax ?? "") === (priceMax ?? ""));
    pills.push({ key: "price", label: `${t("price")} : ${range?.label ?? `${priceMin ?? "0"}-${priceMax ?? "+"} DH`}`, clear: { priceMin: undefined, priceMax: undefined } });
  }
  if (inStockOnly) pills.push({ key: "inStock", label: t("inStockOnly"), clear: { inStock: undefined } });
  if (promoOnly) pills.push({ key: "promo", label: t("promotionsOnly"), clear: { promo: undefined } });

  if (pills.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-3.5" aria-label={t("activeFilters")}>
      {pills.map((pill) => (
        <span
          key={pill.key}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-primary-soft text-brand-primary-strong px-3 py-1 text-xs font-bold"
        >
          {pill.label}
          <button type="button" aria-label={t("removeFilter")} onClick={() => updateParams(pill.clear)} className="hover:opacity-70">
            <X className="size-3" />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={() => updateParams({ ageMin: undefined, ageMax: undefined, priceMin: undefined, priceMax: undefined, inStock: undefined, promo: undefined })}
        className="text-xs font-bold text-muted-foreground hover:text-destructive underline underline-offset-2"
      >
        {t("resetAll")}
      </button>
    </div>
  );
}
