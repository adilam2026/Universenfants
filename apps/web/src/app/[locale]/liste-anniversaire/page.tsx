"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Cake, Copy, Check, Trash2, Search } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { isLoggedIn } from "@/lib/auth-client";
import {
  getMyBirthdayLists,
  createBirthdayList,
  addBirthdayListItem,
  removeBirthdayListItem,
  type BirthdayList,
} from "@/lib/birthday-list-client";
import { getProducts, type ProductSummary } from "@/lib/api";
import { localized } from "@/lib/localized";
import { Button } from "@/components/ui/button";

function dh(value: string | number) {
  return `${Number(value).toLocaleString("fr-FR")} DH`;
}

export default function BirthdayListPage() {
  const t = useTranslations("birthdayList");
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [lists, setLists] = useState<BirthdayList[] | null>(null);
  const [active, setActive] = useState<BirthdayList | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      setLoggedIn(false);
      return;
    }
    setLoggedIn(true);
    refresh();
  }, []);

  async function refresh() {
    const data = await getMyBirthdayLists();
    setLists(data);
    setActive((prev) => data.find((l) => l.id === prev?.id) ?? data[0] ?? null);
  }

  if (loggedIn === null) return null;

  if (!loggedIn) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <Cake className="mx-auto size-10 text-brand-cta mb-3" />
        <p className="text-muted-foreground mb-4">{t("loginPrompt")}</p>
        <Link href="/compte" className="text-primary font-bold text-sm">{t("login")}</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 md:px-7 py-6">
      <h1 className="font-display text-2xl font-extrabold mb-1">{t("title")}</h1>
      <p className="text-sm text-muted-foreground mb-6">{t("subtitle")}</p>

      {!lists ? (
        <p className="text-sm text-muted-foreground py-10 text-center">{t("loading")}</p>
      ) : (
        <div className="grid md:grid-cols-[280px_1fr] gap-5">
          <CreateListCard onCreated={(list) => { setLists((prev) => [list, ...(prev ?? [])]); setActive(list); }} />
          {active ? (
            <ListItemsPanel list={active} onChanged={refresh} />
          ) : (
            <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground h-fit">
              {t("noListYet")}
            </div>
          )}
        </div>
      )}

      {lists && lists.length > 1 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {lists.map((l) => (
            <button
              key={l.id}
              onClick={() => setActive(l)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${active?.id === l.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
            >
              {l.childName}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateListCard({ onCreated }: { onCreated: (list: BirthdayList) => void }) {
  const t = useTranslations("birthdayList");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    try {
      const list = await createBirthdayList({
        childName: String(form.get("childName")),
        eventDate: String(form.get("eventDate")),
        message: String(form.get("message") || "") || undefined,
      });
      onCreated(list);
      formEl.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-4 h-fit flex flex-col gap-3">
      <h3 className="font-bold">{t("createList")}</h3>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-muted-foreground">{t("childName")}</label>
        <input name="childName" required placeholder={t("childNamePlaceholder")} className="rounded-lg border border-border px-3 py-2.5 text-sm" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-muted-foreground">{t("eventDate")}</label>
        <input name="eventDate" type="date" required className="rounded-lg border border-border px-3 py-2.5 text-sm" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-muted-foreground">{t("message")}</label>
        <textarea name="message" rows={2} placeholder={t("messagePlaceholder")} className="rounded-lg border border-border px-3 py-2.5 text-sm" />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button type="submit" disabled={submitting}>{submitting ? t("creating") : t("createButton")}</Button>
    </form>
  );
}

function ListItemsPanel({ list, onChanged }: { list: BirthdayList; onChanged: () => void }) {
  const t = useTranslations("birthdayList");
  const locale = useLocale();
  const [copied, setCopied] = useState(false);
  const [picking, setPicking] = useState(false);

  async function handleCopy() {
    const url = `${window.location.origin}/${locale}/liste-anniversaire/${list.shareToken}`;
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3.5 flex-wrap gap-2">
        <h3 className="font-bold">{t("giftsOnList", { n: list.items.length })}</h3>
        <Button size="sm" onClick={handleCopy}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? t("linkCopied") : t("copyLink")}
        </Button>
      </div>

      <div className="flex flex-col gap-2.5">
        {list.items.map((item) => (
          <div key={item.id} className="rounded-2xl border border-border bg-card p-3.5 flex items-center gap-3">
            <div className="size-12 shrink-0 rounded-xl bg-brand-primary-soft flex items-center justify-center text-xl">🧸</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{localized(item.product.nameFr, item.product.nameAr, locale)}</p>
              <p className="text-xs text-muted-foreground">{dh(item.product.promoPrice ?? item.product.price)}</p>
            </div>
            {item.reserved ? (
              <span className="rounded-full bg-brand-highlight-soft text-brand-highlight-foreground px-2.5 py-1 text-[11px] font-bold">
                {t("reserved")}
              </span>
            ) : (
              <button
                onClick={async () => { await removeBirthdayListItem(list.id, item.id); onChanged(); }}
                className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-secondary"
                aria-label={t("close")}
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
        ))}
        {list.items.length === 0 && (
          <p className="text-sm text-muted-foreground py-6 text-center">{t("noGifts")}</p>
        )}
      </div>

      {picking ? (
        <ProductPicker
          onPick={async (productId) => { await addBirthdayListItem(list.id, productId); onChanged(); }}
          onClose={() => setPicking(false)}
        />
      ) : (
        <Button variant="ghost" className="w-full mt-3" onClick={() => setPicking(true)}>
          {t("addProduct")}
        </Button>
      )}
    </div>
  );
}

function ProductPicker({ onPick, onClose }: { onPick: (productId: string) => void; onClose: () => void }) {
  const t = useTranslations("birthdayList");
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductSummary[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await getProducts({ q: query || undefined, limit: 6 });
      setResults(data.items);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3 rounded-2xl border border-border bg-card p-3.5">
      <form onSubmit={handleSearch} className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-lg border border-border pl-9 pr-3 rtl:pl-3 rtl:pr-9 py-2 text-sm"
          />
        </div>
        <Button type="submit" size="sm" disabled={loading}>{loading ? "…" : t("searchButton")}</Button>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>{t("close")}</Button>
      </form>
      {results && (
        <div className="flex flex-col gap-2">
          {results.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">{t("noSearchResults")}</p>}
          {results.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate">{localized(p.nameFr, p.nameAr, locale)}</span>
              <Button size="sm" variant="outline" onClick={() => onPick(p.id)}>{t("add")}</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
