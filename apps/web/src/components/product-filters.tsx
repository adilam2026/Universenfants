"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { X } from "lucide-react";
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

function FilterContent({
  activeSlug,
  categories,
}: {
  activeSlug?: string;
  categories: { slug: string; nameFr: string; nameAr?: string | null; image: string | null }[];
}) {
  const t = useTranslations("filters");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeAgeMin = searchParams.get("ageMin");
  const activeAgeMax = searchParams.get("ageMax");
  const inStockOnly = searchParams.get("inStock") === "1";

  function updateParams(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === undefined) params.delete(key);
      else params.set(key, value);
    }
    router.push(`?${params.toString()}`, { scroll: false });
  }

  function toggleAge(range: (typeof AGE_RANGES)[number]) {
    const isActive = String(range.ageMin ?? "") === (activeAgeMin ?? "") && String(range.ageMax ?? "") === (activeAgeMax ?? "");
    updateParams({
      ageMin: isActive ? undefined : range.ageMin !== undefined ? String(range.ageMin) : undefined,
      ageMax: isActive ? undefined : range.ageMax !== undefined ? String(range.ageMax) : undefined,
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
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/categorie/${c.slug}`}
              className={`text-sm ${activeSlug === c.slug ? "font-extrabold text-primary" : "text-muted-foreground"}`}
            >
              {c.image} {localized(c.nameFr, c.nameAr, locale)}
            </Link>
          ))}
        </div>
      </div>
      <div className="border-t border-border pt-4">
        <h4 className="text-sm font-bold mb-2.5">{t("age")}</h4>
        <div className="flex flex-wrap gap-1.5">
          {AGE_RANGES.map((range) => {
            const active = String(range.ageMin ?? "") === (activeAgeMin ?? "") && String(range.ageMax ?? "") === (activeAgeMax ?? "") && activeAgeMin !== null;
            return (
              <button
                key={range.label}
                type="button"
                onClick={() => toggleAge(range)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-bold transition-colors",
                  active ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                {range.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="border-t border-border pt-4">
        <h4 className="text-sm font-bold mb-2.5">{t("availability")}</h4>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => updateParams({ inStock: e.target.checked ? "1" : undefined })}
            className="accent-primary"
          />
          {t("inStockOnly")}
        </label>
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
      <aside className="hidden md:block w-56 shrink-0">
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
  return (
    <button
      className="md:hidden shrink-0 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-bold"
      onClick={() => window.dispatchEvent(new Event(TOGGLE_MOBILE_FILTERS_EVENT))}
    >
      {t("filter")}
    </button>
  );
}
