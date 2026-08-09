"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listCities, createCity, updateCity, type AdminCity } from "@/lib/cities";
import { ApiError } from "@/lib/api-client";

function dh(value: string | number) {
  return `${Number(value).toLocaleString("fr-FR")} DH`;
}

export default function ShippingPage() {
  const [cities, setCities] = useState<AdminCity[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    listCities().then(setCities);
  }
  useEffect(refresh, []);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    try {
      await createCity({
        name: String(form.get("name")),
        shippingFee: Number(form.get("shippingFee")),
        freeShippingFrom: form.get("freeShippingFrom") ? Number(form.get("freeShippingFrom")) : undefined,
      });
      formEl.reset();
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    }
  }

  async function handleRowSave(city: AdminCity, shippingFee: string, freeShippingFrom: string, active: boolean) {
    try {
      await updateCity(city.id, {
        name: city.name,
        shippingFee: Number(shippingFee),
        freeShippingFrom: freeShippingFrom ? Number(freeShippingFrom) : undefined,
        active,
      });
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-5">Livraison</h1>
      <p className="text-sm text-muted-foreground mb-5">
        Frais de livraison et seuil de gratuité par ville — la règle ville prime toujours sur le seuil global (Paramètres).
      </p>

      <Card className="mb-5">
        <CardHeader><CardTitle>Ajouter une ville</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid sm:grid-cols-4 gap-3 items-end">
            <div className="flex flex-col gap-1.5">
              <Label>Nom</Label>
              <Input name="name" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Frais (DH)</Label>
              <Input name="shippingFee" type="number" step="0.01" min={0} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Gratuit dès (DH)</Label>
              <Input name="freeShippingFrom" type="number" step="0.01" min={0} />
            </div>
            <Button type="submit"><Plus className="size-4" /> Ajouter</Button>
          </form>
        </CardContent>
      </Card>

      {/* Affiché ici plutôt que dans la carte "Ajouter une ville" : une
          erreur d'enregistrement sur une ligne du tableau (souvent scrollé
          loin du formulaire d'ajout) restait auparavant invisible pour
          l'opérateur. */}
      {error && <p className="text-sm text-destructive mb-3">{error}</p>}
      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Ville</th>
              <th className="px-4 py-3">Groupe</th>
              <th className="px-4 py-3">Frais (DH)</th>
              <th className="px-4 py-3">Gratuit dès (DH)</th>
              <th className="px-4 py-3">Active</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {cities?.map((c) => <CityRow key={c.id} city={c} onSave={handleRowSave} />)}
          </tbody>
        </table>
        {!cities && <p className="text-sm text-muted-foreground text-center py-10">Chargement…</p>}
      </div>
    </div>
  );
}

function CityRow({ city, onSave }: { city: AdminCity; onSave: (city: AdminCity, fee: string, freeFrom: string, active: boolean) => void }) {
  const [fee, setFee] = useState(city.shippingFee);
  const [freeFrom, setFreeFrom] = useState(city.freeShippingFrom ?? "");
  const [active, setActive] = useState(city.active);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await onSave(city, fee, String(freeFrom), active);
    setSaving(false);
  }

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-4 py-2.5 font-medium">{city.name}</td>
      <td className="px-4 py-2.5 text-muted-foreground">{city.group?.name ?? "—"}</td>
      <td className="px-4 py-2.5"><Input value={fee} onChange={(e) => setFee(e.target.value)} type="number" step="0.01" min={0} className="w-24" /></td>
      <td className="px-4 py-2.5"><Input value={freeFrom} onChange={(e) => setFreeFrom(e.target.value)} type="number" step="0.01" min={0} className="w-28" placeholder={dh(0)} /></td>
      <td className="px-4 py-2.5">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="size-4" />
      </td>
      <td className="px-4 py-2.5">
        <Button size="sm" variant="outline" onClick={save} disabled={saving}>{saving ? "…" : "Enregistrer"}</Button>
      </td>
    </tr>
  );
}
