"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Cake, Copy, Check, Trash2, Search } from "lucide-react";
import { isLoggedIn } from "@/lib/auth-client";
import {
  getMyBirthdayLists,
  createBirthdayList,
  addBirthdayListItem,
  removeBirthdayListItem,
  type BirthdayList,
} from "@/lib/birthday-list-client";
import { getProducts, type ProductSummary } from "@/lib/api";
import { Button } from "@/components/ui/button";

function dh(value: string | number) {
  return `${Number(value).toLocaleString("fr-FR")} DH`;
}

export default function BirthdayListPage() {
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
        <p className="text-muted-foreground mb-4">Connectez-vous pour créer une liste anniversaire.</p>
        <Link href="/compte" className="text-primary font-bold text-sm">Se connecter</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 md:px-7 py-6">
      <h1 className="font-display text-2xl font-extrabold mb-1">🎂 Liste anniversaire</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Crée la liste de cadeaux idéale, partage le lien, les invités réservent sans doublon.
      </p>

      {!lists ? (
        <p className="text-sm text-muted-foreground py-10 text-center">Chargement…</p>
      ) : (
        <div className="grid md:grid-cols-[280px_1fr] gap-5">
          <CreateListCard onCreated={(list) => { setLists((prev) => [list, ...(prev ?? [])]); setActive(list); }} />
          {active ? (
            <ListItemsPanel list={active} onChanged={refresh} />
          ) : (
            <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground h-fit">
              Créez votre première liste anniversaire pour commencer à ajouter des cadeaux.
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
      <h3 className="font-bold">Créer une liste</h3>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-muted-foreground">Nom de l&apos;enfant</label>
        <input name="childName" required placeholder="Yasmine" className="rounded-lg border border-border px-3 py-2.5 text-sm" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-muted-foreground">Date d&apos;anniversaire</label>
        <input name="eventDate" type="date" required className="rounded-lg border border-border px-3 py-2.5 text-sm" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-muted-foreground">Message</label>
        <textarea name="message" rows={2} placeholder="Un petit mot pour les invités…" className="rounded-lg border border-border px-3 py-2.5 text-sm" />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button type="submit" disabled={submitting}>{submitting ? "Création…" : "Créer la liste"}</Button>
    </form>
  );
}

function ListItemsPanel({ list, onChanged }: { list: BirthdayList; onChanged: () => void }) {
  const [copied, setCopied] = useState(false);
  const [picking, setPicking] = useState(false);

  async function handleCopy() {
    const url = `${window.location.origin}/liste-anniversaire/${list.shareToken}`;
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3.5 flex-wrap gap-2">
        <h3 className="font-bold">Cadeaux sur la liste ({list.items.length})</h3>
        <Button size="sm" onClick={handleCopy}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Lien copié !" : "Copier le lien de partage"}
        </Button>
      </div>

      <div className="flex flex-col gap-2.5">
        {list.items.map((item) => (
          <div key={item.id} className="rounded-2xl border border-border bg-card p-3.5 flex items-center gap-3">
            <div className="size-12 shrink-0 rounded-xl bg-brand-primary-soft flex items-center justify-center text-xl">🧸</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{item.product.nameFr}</p>
              <p className="text-xs text-muted-foreground">{dh(item.product.promoPrice ?? item.product.price)}</p>
            </div>
            {item.reserved ? (
              <span className="rounded-full bg-brand-highlight-soft text-brand-highlight-foreground px-2.5 py-1 text-[11px] font-bold">
                🎁 Réservé
              </span>
            ) : (
              <button
                onClick={async () => { await removeBirthdayListItem(list.id, item.id); onChanged(); }}
                className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-secondary"
                aria-label="Retirer"
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
        ))}
        {list.items.length === 0 && (
          <p className="text-sm text-muted-foreground py-6 text-center">Aucun cadeau pour l&apos;instant.</p>
        )}
      </div>

      {picking ? (
        <ProductPicker
          onPick={async (productId) => { await addBirthdayListItem(list.id, productId); onChanged(); }}
          onClose={() => setPicking(false)}
        />
      ) : (
        <Button variant="ghost" className="w-full mt-3" onClick={() => setPicking(true)}>
          + Ajouter un produit depuis le catalogue
        </Button>
      )}
    </div>
  );
}

function ProductPicker({ onPick, onClose }: { onPick: (productId: string) => void; onClose: () => void }) {
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un jouet…"
            className="w-full rounded-lg border border-border pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <Button type="submit" size="sm" disabled={loading}>{loading ? "…" : "Chercher"}</Button>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>Fermer</Button>
      </form>
      {results && (
        <div className="flex flex-col gap-2">
          {results.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">Aucun résultat.</p>}
          {results.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate">{p.nameFr}</span>
              <Button size="sm" variant="outline" onClick={() => onPick(p.id)}>Ajouter</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
