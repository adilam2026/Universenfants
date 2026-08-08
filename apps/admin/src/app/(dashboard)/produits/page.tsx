"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { listAdminProducts, type AdminProduct } from "@/lib/products";

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
  const [products, setProducts] = useState<AdminProduct[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    listAdminProducts().then(setProducts);
  }, []);

  const filtered = products?.filter((p) => p.nameFr.toLowerCase().includes(query.toLowerCase()) || p.sku.toLowerCase().includes(query.toLowerCase()));

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
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher par nom ou SKU…" className="pl-9" />
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
            {filtered?.map((p) => (
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
        {filtered && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-10">Aucun produit trouvé.</p>
        )}
        {!products && <p className="text-sm text-muted-foreground text-center py-10">Chargement…</p>}
      </div>
    </div>
  );
}
