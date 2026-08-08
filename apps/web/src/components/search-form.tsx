"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useRouter } from "@/i18n/navigation";

/** Isolé dans son propre composant + Suspense (requis par useSearchParams)
 * pour ne pas retarder le rendu du reste du header : le header entier
 * n'a pas besoin d'attendre la résolution des search params. */
export function SearchForm() {
  const searchParams = useSearchParams();
  return <SearchFormInner initialQuery={searchParams.get("q") ?? ""} />;
}

function SearchFormInner({ initialQuery }: { initialQuery: string }) {
  const t = useTranslations("nav");
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/recherche?q=${encodeURIComponent(trimmed)}` : "/recherche");
  }

  return (
    <form onSubmit={handleSubmit} className="relative flex-1">
      <Search className="absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("searchPlaceholder")}
        className="w-full rounded-full border-2 border-border bg-background py-3 pl-10 pr-4 rtl:pl-4 rtl:pr-10 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </form>
  );
}

export function SearchFormFallback() {
  const t = useTranslations("nav");
  return (
    <div className="relative flex-1">
      <Search className="absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
      <input
        type="search"
        readOnly
        placeholder={t("searchPlaceholder")}
        className="w-full rounded-full border-2 border-border bg-background py-3 pl-10 pr-4 rtl:pl-4 rtl:pr-10 text-sm outline-none"
      />
    </div>
  );
}
