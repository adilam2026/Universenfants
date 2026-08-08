"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { listCustomers, type AdminCustomerSummary } from "@/lib/customers";

function dh(value: string | number) {
  return `${Number(value).toLocaleString("fr-FR")} DH`;
}

export default function CustomersListPage() {
  const [customers, setCustomers] = useState<AdminCustomerSummary[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    listCustomers().then(setCustomers);
  }, []);

  const filtered = customers?.filter((c) => {
    const name = `${c.firstName ?? ""} ${c.lastName ?? ""}`.toLowerCase();
    return name.includes(query.toLowerCase()) || (c.email ?? "").toLowerCase().includes(query.toLowerCase()) || (c.phone ?? "").includes(query);
  });

  return (
    <div>
      <h1 className="text-xl font-bold mb-5">Clients</h1>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher par nom, email, téléphone…" className="pl-9" />
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
            {filtered?.map((c) => (
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
        {filtered && filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-10">Aucun client trouvé.</p>}
        {!customers && <p className="text-sm text-muted-foreground text-center py-10">Chargement…</p>}
      </div>
    </div>
  );
}
