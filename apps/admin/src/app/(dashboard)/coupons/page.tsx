"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { listCoupons, createCoupon, updateCoupon, type AdminCoupon } from "@/lib/coupons";
import { ApiError } from "@/lib/api-client";

function dh(value: string | number) {
  return `${Number(value).toLocaleString("fr-FR")} DH`;
}

const TYPE_LABEL: Record<string, string> = {
  PERCENTAGE: "%",
  FIXED_AMOUNT: "DH",
  FREE_SHIPPING: "Livraison offerte",
};

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<AdminCoupon[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  function refresh() {
    listCoupons().then(setCoupons);
  }
  useEffect(refresh, []);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    try {
      await createCoupon({
        code: String(form.get("code")),
        type: String(form.get("type")) as AdminCoupon["type"],
        value: Number(form.get("value")),
        startAt: String(form.get("startAt")),
        endAt: String(form.get("endAt")),
        minCartAmount: form.get("minCartAmount") ? Number(form.get("minCartAmount")) : undefined,
        maxUsesPerCustomer: 1,
      });
      formEl.reset();
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    } finally {
      setCreating(false);
    }
  }

  async function toggleStatus(coupon: AdminCoupon) {
    const nextStatus = coupon.status === "ACTIVE" ? "ENDED" : "ACTIVE";
    await updateCoupon(coupon.id, {
      code: coupon.code,
      type: coupon.type,
      value: Number(coupon.value),
      startAt: coupon.startAt,
      endAt: coupon.endAt,
      maxUsesPerCustomer: coupon.maxUsesPerCustomer,
      minCartAmount: Number(coupon.minCartAmount),
      status: nextStatus,
    });
    refresh();
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-5">Coupons</h1>

      <Card className="mb-5">
        <CardHeader><CardTitle>Nouveau coupon</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
            <div className="flex flex-col gap-1.5">
              <Label>Code</Label>
              <Input name="code" required placeholder="RENTREE10" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <select name="type" required className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="PERCENTAGE">% du panier</option>
                <option value="FIXED_AMOUNT">Montant fixe</option>
                <option value="FREE_SHIPPING">Livraison offerte</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Valeur</Label>
              <Input name="value" type="number" step="0.01" min={0} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Panier min (DH)</Label>
              <Input name="minCartAmount" type="number" step="0.01" min={0} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Début</Label>
              <Input name="startAt" type="date" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Fin</Label>
              <Input name="endAt" type="date" required />
            </div>
            <div className="sm:col-span-3 lg:col-span-6">
              <Button type="submit" disabled={creating}><Plus className="size-4" /> {creating ? "Création…" : "Créer le coupon"}</Button>
            </div>
          </form>
          {error && <p className="text-sm text-destructive mt-3">{error}</p>}
        </CardContent>
      </Card>

      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Réduction</th>
              <th className="px-4 py-3">Validité</th>
              <th className="px-4 py-3">Utilisations</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {coupons?.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-bold">{c.code}</td>
                <td className="px-4 py-3">{c.type === "FREE_SHIPPING" ? TYPE_LABEL.FREE_SHIPPING : `${c.value} ${TYPE_LABEL[c.type]}`}</td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(c.startAt).toLocaleDateString("fr-FR")} → {new Date(c.endAt).toLocaleDateString("fr-FR")}</td>
                <td className="px-4 py-3">{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ""}</td>
                <td className="px-4 py-3"><Badge variant={c.status === "ACTIVE" ? "success" : "outline"}>{c.status}</Badge></td>
                <td className="px-4 py-3">
                  <Button size="sm" variant="outline" onClick={() => toggleStatus(c)}>
                    {c.status === "ACTIVE" ? "Désactiver" : "Activer"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {coupons && coupons.length === 0 && <p className="text-sm text-muted-foreground text-center py-10">Aucun coupon.</p>}
        {!coupons && <p className="text-sm text-muted-foreground text-center py-10">Chargement…</p>}
      </div>
    </div>
  );
}
