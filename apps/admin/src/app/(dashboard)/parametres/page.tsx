"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSettings, updateSettings, type AdminSettings } from "@/lib/settings";
import { ApiError } from "@/lib/api-client";

export default function SettingsPage() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setSaved(false);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const updated = await updateSettings({
        vatRate: Number(form.get("vatRate")) / 100,
        loyaltyRedeemRate: Number(form.get("loyaltyRedeemRate")),
        freeShippingThreshold: Number(form.get("freeShippingThreshold")),
      });
      setSettings(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    } finally {
      setSubmitting(false);
    }
  }

  if (!settings) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  return (
    <div>
      <h1 className="text-xl font-bold mb-5">Paramètres</h1>

      <Card className="max-w-lg">
        <CardHeader><CardTitle>Paramètres globaux</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="vatRate">Taux de TVA (%)</Label>
              <Input id="vatRate" name="vatRate" type="number" step="0.1" min={0} max={100} defaultValue={settings.vatRate * 100} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="loyaltyRedeemRate">Points fidélité requis pour 1 DH de réduction</Label>
              <Input id="loyaltyRedeemRate" name="loyaltyRedeemRate" type="number" min={1} defaultValue={settings.loyaltyRedeemRate} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="freeShippingThreshold">Seuil de livraison gratuite global (DH)</Label>
              <Input id="freeShippingThreshold" name="freeShippingThreshold" type="number" min={0} defaultValue={settings.freeShippingThreshold} />
              <p className="text-xs text-muted-foreground">S&apos;applique aux villes sans seuil spécifique (voir Livraison).</p>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={submitting}>
              {submitting ? "Enregistrement…" : saved ? "Enregistré ✓" : "Enregistrer"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
