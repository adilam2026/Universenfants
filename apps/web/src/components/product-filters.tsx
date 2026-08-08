"use client";

import { useTranslations, useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { localized } from "@/lib/localized";

const SORT_VALUES = ["relevance", "price_asc", "price_desc", "bestsellers", "newest"] as const;

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

export function FilterSidebar({ activeSlug, categories }: { activeSlug?: string; categories: { slug: string; nameFr: string; nameAr?: string | null; image: string | null }[] }) {
  const t = useTranslations("filters");
  const locale = useLocale();

  return (
    <aside className="hidden md:block w-56 shrink-0 space-y-5">
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
          {["0-2", "3-5", "6-8", "9-12", "12+"].map((a) => (
            <span key={a} className="rounded-full border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground">
              {a}
            </span>
          ))}
        </div>
      </div>
      <div className="border-t border-border pt-4">
        <h4 className="text-sm font-bold mb-2.5">{t("availability")}</h4>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" defaultChecked className="accent-primary" /> {t("inStockOnly")}
        </label>
      </div>
    </aside>
  );
}

export function MobileFilterButton() {
  const t = useTranslations("filters");
  return (
    <button className="md:hidden shrink-0 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-bold">{t("filter")}</button>
  );
}
