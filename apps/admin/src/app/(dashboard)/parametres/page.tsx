"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSettings, updateSettings, type AdminSettings } from "@/lib/settings";
import { ApiError, changeStaffPassword, staffLogout } from "@/lib/api-client";
import { useStaffUser } from "@/hooks/use-staff-user";

function ChangePasswordCard() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const currentPassword = String(form.get("currentPassword") ?? "");
    const newPassword = String(form.get("newPassword") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");
    if (newPassword !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas");
      return;
    }
    if (newPassword.length < 8) {
      setError("Le nouveau mot de passe doit contenir au moins 8 caractères");
      return;
    }
    setSubmitting(true);
    try {
      await changeStaffPassword(currentPassword, newPassword);
      setDone(true);
      // Le changement révoque les sessions existantes côté serveur (voir
      // StaffAuthService.changePassword) — reconnexion immédiate avec le
      // nouveau mot de passe pour confirmer qu'il fonctionne, plutôt que de
      // laisser croire que la session en cours reste valable indéfiniment.
      setTimeout(() => {
        staffLogout();
        router.replace("/login");
      }, 1500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="max-w-lg mt-5">
      <CardHeader><CardTitle>Mon compte — Changer mon mot de passe</CardTitle></CardHeader>
      <CardContent>
        {done ? (
          <p className="text-sm text-primary font-medium">Mot de passe modifié. Reconnexion…</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="currentPassword">Mot de passe actuel</Label>
              <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="newPassword">Nouveau mot de passe</Label>
              <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" minLength={8} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</Label>
              <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={submitting} className="w-fit">
              {submitting ? "Modification…" : "Changer mon mot de passe"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const user = useStaffUser();
  // La lecture (GET /settings) n'est pas restreinte par rôle — seule la
  // sauvegarde l'est côté API (SETTINGS_MANAGE). Sans ce contrôle ici, un
  // membre du staff sans ce droit pouvait remplir tout le formulaire et ne
  // découvrir le refus qu'à la soumission.
  const canManage = (user?.permissions ?? []).includes("settings.manage");
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
          {!canManage && (
            <p className="text-xs rounded-lg bg-secondary p-2.5 mb-3.5">
              Lecture seule : votre rôle ne vous permet pas de modifier les paramètres.
            </p>
          )}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <fieldset disabled={!canManage} className="contents">
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
            </fieldset>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {canManage && (
              <Button type="submit" disabled={submitting}>
                {submitting ? "Enregistrement…" : saved ? "Enregistré ✓" : "Enregistrer"}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      <ChangePasswordCard />
    </div>
  );
}
