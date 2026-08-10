"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import useSWR, { preload } from "swr";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/ui/skeleton";
import { listCustomers, customerListKey } from "@/lib/customers";
import { LIST_PAGE_SIZE } from "@/lib/list-defaults";

function dh(value: string | number) {
  return `${Number(value).toLocaleString("fr-FR")} DH`;
}

export default function CustomersListPage() {
  const [queryInput, setQueryInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(queryInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [queryInput]);

  const filters = { q: q || undefined, page, limit: LIST_PAGE_SIZE };
  const { data } = useSWR(customerListKey(filters), () => listCustomers(filters));
  const customers = data?.items ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / LIST_PAGE_SIZE)) : 1;

  useEffect(() => {
    if (data && page < totalPages) {
      const nextFilters = { ...filters, page: page + 1 };
      preload(customerListKey(nextFilters), () => listCustomers(nextFilters));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, page, totalPages, q]);

  return (
    <div>
      <h1 className="text-xl font-bold mb-5">Clients</h1>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input value={queryInput} onChange={(e) => setQueryInput(e.target.value)} placeholder="Rechercher par nom, email, téléphone…" className="pl-9" />
      </div>

      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Commandes</th>
              <th className="px-4 py-3">Total dépensé</th>
              <th className="px-4 py-3">Inscrit le</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0 hover:bg-secondary/50">
                <td className="px-4 py-3">
                  <Link href={`/clients/${c.id}`} className="font-medium hover:text-primary">
                    {c.firstName} {c.lastName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{c.email ?? c.phone ?? "—"}</td>
                <td className="px-4 py-3">{c.ordersCount}</td>
                <td className="px-4 py-3 font-medium">{dh(c.totalSpent)}</td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(c.createdAt).toLocaleDateString("fr-FR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && customers.length === 0 && <p className="text-sm text-muted-foreground text-center py-10">Aucun client trouvé.</p>}
        {!data && <TableSkeleton columns={5} />}
      </div>

      {data && data.total > 0 && (
        <div className="flex items-center justify-between mt-3.5 text-sm text-muted-foreground">
          <p>{data.total} client{data.total > 1 ? "s" : ""} · page {page} / {totalPages}</p>
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
