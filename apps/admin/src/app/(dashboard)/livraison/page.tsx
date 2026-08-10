"use client";

import { useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TableSkeleton } from "@/components/ui/skeleton";
import {
  createCity,
  updateCity,
  createCityGroup,
  updateCityGroup,
  removeCityGroup,
  type AdminCity,
  type AdminCityGroup,
} from "@/lib/cities";
import { ApiError } from "@/lib/api-client";
import { useCities, useCityGroups } from "@/hooks/reference-data";

function dh(value: string | number) {
  return `${Number(value).toLocaleString("fr-FR")} DH`;
}

export default function ShippingPage() {
  const { data: cities, mutate: refreshCities } = useCities();
  const { data: groups, mutate: refreshGroups } = useCityGroups();
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    refreshCities();
    refreshGroups();
  }

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
      refreshCities();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    }
  }

  // Peut changer le groupe de la ville : rafraîchit aussi les groupes (le
  // compteur "N villes" affiché sur chaque groupe en dépend), pas seulement
  // les villes.
  async function handleRowSave(city: AdminCity, shippingFee: string, freeShippingFrom: string, active: boolean, groupId: string) {
    try {
      await updateCity(city.id, {
        name: city.name,
        shippingFee: Number(shippingFee),
        freeShippingFrom: freeShippingFrom ? Number(freeShippingFrom) : undefined,
        active,
        groupId: groupId || null,
      });
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    }
  }

  async function handleCreateGroup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    try {
      await createCityGroup({
        name: String(form.get("name")),
        shippingFee: Number(form.get("shippingFee")),
        freeShippingFrom: form.get("freeShippingFrom") ? Number(form.get("freeShippingFrom")) : undefined,
      });
      formEl.reset();
      refreshGroups();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    }
  }

  // Supprimer un groupe libère les villes qui y étaient rattachées :
  // rafraîchit aussi les villes.
  async function handleRemoveGroup(id: string) {
    setError(null);
    try {
      await removeCityGroup(id);
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    }
  }

  async function handleSaveGroup(group: AdminCityGroup, shippingFee: string, freeShippingFrom: string) {
    setError(null);
    try {
      await updateCityGroup(group.id, {
        name: group.name,
        shippingFee: Number(shippingFee),
        freeShippingFrom: freeShippingFrom ? Number(freeShippingFrom) : undefined,
      });
      refreshGroups();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-5">Livraison</h1>
      <p className="text-sm text-muted-foreground mb-5">
        Frais de livraison et seuil de gratuité par ville — la règle ville prime sur le groupe, qui prime sur le seuil global (Paramètres).
      </p>

      <Card className="mb-5">
        <CardHeader><CardTitle>Groupes de villes</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleCreateGroup} className="grid sm:grid-cols-4 gap-3 items-end mb-4">
            <div className="flex flex-col gap-1.5">
              <Label>Nom du groupe</Label>
              <Input name="name" required placeholder="ex: Grandes villes" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Frais (DH)</Label>
              <Input name="shippingFee" type="number" step="0.01" min={0} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Gratuit dès (DH)</Label>
              <Input name="freeShippingFrom" type="number" step="0.01" min={0} />
            </div>
            <Button type="submit"><Plus className="size-4" /> Ajouter un groupe</Button>
          </form>
          {groups && groups.length > 0 && (
            <div className="divide-y divide-border border-t border-border">
              {groups.map((g) => (
                <CityGroupRow key={g.id} group={g} onSave={handleSaveGroup} onRemove={handleRemoveGroup} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
            {cities?.map((c) => <CityRow key={c.id} city={c} groups={groups ?? []} onSave={handleRowSave} />)}
          </tbody>
        </table>
        {!cities && <TableSkeleton columns={5} />}
      </div>
    </div>
  );
}

function CityRow({
  city,
  groups,
  onSave,
}: {
  city: AdminCity;
  groups: AdminCityGroup[];
  onSave: (city: AdminCity, fee: string, freeFrom: string, active: boolean, groupId: string) => void;
}) {
  const [fee, setFee] = useState(city.shippingFee);
  const [freeFrom, setFreeFrom] = useState(city.freeShippingFrom ?? "");
  const [active, setActive] = useState(city.active);
  const [groupId, setGroupId] = useState(city.groupId ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await onSave(city, fee, String(freeFrom), active, groupId);
    setSaving(false);
  }

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-4 py-2.5 font-medium">{city.name}</td>
      <td className="px-4 py-2.5">
        <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className="h-9 rounded-md border border-border bg-background px-2 text-sm">
          <option value="">Aucun</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
      </td>
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

function CityGroupRow({
  group,
  onSave,
  onRemove,
}: {
  group: AdminCityGroup;
  onSave: (group: AdminCityGroup, fee: string, freeFrom: string) => void;
  onRemove: (id: string) => void;
}) {
  const [fee, setFee] = useState(group.shippingFee);
  const [freeFrom, setFreeFrom] = useState(group.freeShippingFrom ?? "");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  async function save() {
    setSaving(true);
    await onSave(group, fee, String(freeFrom));
    setSaving(false);
  }

  async function remove() {
    if (removing) return;
    setRemoving(true);
    await onRemove(group.id);
    setRemoving(false);
  }

  return (
    <div className="flex items-center justify-between py-2.5 text-sm gap-3 flex-wrap">
      <div>
        <span className="font-medium">{group.name}</span>
        <span className="text-xs text-muted-foreground ml-2">({group.cities.length} ville{group.cities.length > 1 ? "s" : ""})</span>
      </div>
      <div className="flex items-center gap-2">
        <Input value={fee} onChange={(e) => setFee(e.target.value)} type="number" step="0.01" min={0} className="w-24" />
        <Input value={freeFrom} onChange={(e) => setFreeFrom(e.target.value)} type="number" step="0.01" min={0} className="w-28" placeholder={dh(0)} />
        <Button size="sm" variant="outline" onClick={save} disabled={saving}>{saving ? "…" : "Enregistrer"}</Button>
        <Button size="sm" variant="ghost" onClick={remove} disabled={removing} aria-label="Supprimer le groupe">
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}
