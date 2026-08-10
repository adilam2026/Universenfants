"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import useSWR, { preload } from "swr";
import { Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/ui/skeleton";
import { listAdminProducts, productListKey, type AdminProduct } from "@/lib/products";
import { LIST_PAGE_SIZE } from "@/lib/list-defaults";

function dh(value: string | number) {
  return `${Number(value).toLocaleString("fr-FR")} DH`;
}

const STATUS_VARIANT: Record<string, "default" | "primary" | "success" | "warning" | "destructive"> = {
  DRAFT: "default",
  ACTIVE: "success",
  INACTIVE: "warning",
  ARCHIVED: "destructive",
};

export default function ProductsListPage() {
  const [queryInput, setQueryInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  // Recherche serveur, débouncée : filtrer côté client n'aurait porté que
  // sur la page actuellement chargée (50 lignes), pas sur tout le catalogue.
  // Revenir à la page 1 à chaque nouvelle recherche évite d'atterrir sur une
  // page qui n'existe plus pour les nouveaux résultats.
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(queryInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [queryInput]);

  const filters = { q: q || undefined, page, limit: LIST_PAGE_SIZE };
  const { data } = useSWR(productListKey(filters), () => listAdminProducts(filters));
  const products: AdminProduct[] = data?.items ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / LIST_PAGE_SIZE)) : 1;

  // Précharge la page suivante pendant que l'admin regarde la page actuelle
  // — le clic "Suivant" retrouve alors une donnée déjà en cache.
  useEffect(() => {
    if (data && page < totalPages) {
      const nextFilters = { ...filters, page: page + 1 };
      preload(productListKey(nextFilters), () => listAdminProducts(nextFilters));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, page, totalPages, q]);

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h1 className="text-xl font-bold">Produits</h1>
        <Button asChild>
          <Link href="/produits/nouveau"><Plus className="size-4" /> Nouveau produit</Link>
        </Button>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input value={queryInput} onChange={(e) => setQueryInput(e.target.value)} placeholder="Rechercher par nom ou SKU…" className="pl-9" />
      </div>

      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Produit</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Catégorie</th>
              <th className="px-4 py-3">Prix</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Statut</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0 hover:bg-secondary/50">
                <td className="px-4 py-3">
                  <Link href={`/produits/${p.id}`} className="font-medium hover:text-primary">{p.nameFr}</Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{p.sku}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.category.nameFr}</td>
                <td className="px-4 py-3">
                  {dh(p.promoPrice ?? p.price)}
                  {p.promoPrice && <span className="ml-1.5 text-xs text-muted-foreground line-through">{dh(p.price)}</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={p.stock <= p.alertThreshold ? "text-brand-warning font-bold" : ""}>{p.stock}</span>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_VARIANT[p.status] ?? "default"}>{p.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && products.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-10">Aucun produit trouvé.</p>
        )}
        {!data && <TableSkeleton columns={6} />}
      </div>

      {data && data.total > 0 && (
        <div className="flex items-center justify-between mt-3.5 text-sm text-muted-foreground">
          <p>{data.total} produit{data.total > 1 ? "s" : ""} · page {page} / {totalPages}</p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              <ChevronLeft className="size-4" /> Précédent
            </Button>
            <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              Suivant <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
