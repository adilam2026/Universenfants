"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCustomer, type AdminCustomerDetail } from "@/lib/customers";

function dh(value: string | number) {
  return `${Number(value).toLocaleString("fr-FR")} DH`;
}

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [customer, setCustomer] = useState<AdminCustomerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCustomer(id).then(setCustomer).catch((e) => setError(e instanceof Error ? e.message : "Client introuvable"));
  }, [id]);

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!customer) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">
        <Link href="/clients" className="hover:text-foreground">Clients</Link> › {customer.firstName} {customer.lastName}
      </p>
      <h1 className="text-xl font-bold mb-5">{customer.firstName} {customer.lastName}</h1>

      <div className="grid lg:grid-cols-[1fr_280px] gap-5 items-start">
        <Card>
          <CardHeader><CardTitle>Commandes</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {customer.orders.map((o) => (
                <div key={o.id} className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm font-medium">{o.orderNumber}</span>
                  <span className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleDateString("fr-FR")}</span>
                  <span className="text-sm font-bold">{dh(o.total)}</span>
                  <Badge>{o.status}</Badge>
                </div>
              ))}
              {customer.orders.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Aucune commande.</p>}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader><CardTitle>Coordonnées</CardTitle></CardHeader>
            <CardContent className="text-sm flex flex-col gap-1.5">
              <p>{customer.email ?? "—"}</p>
              <p>{customer.phone ?? "—"}</p>
              <p className="text-muted-foreground pt-2 border-t border-border mt-1.5">Total dépensé : {dh(customer.totalSpent)}</p>
              <p className="text-muted-foreground">Points fidélité : {customer.loyaltyAccount?.pointsBalance ?? 0}</p>
            </CardContent>
          </Card>

          {customer.addresses.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Adresses</CardTitle></CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                {customer.addresses.map((a) => (
                  <p key={a.id}>{a.label ? `${a.label} — ` : ""}{a.addressLine}, {a.city}</p>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
