"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Star, Package, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isLoggedIn, login, register, logout, me, type CustomerProfile } from "@/lib/auth-client";

function dh(value: string | number) {
  return `${Number(value).toLocaleString("fr-FR")} DH`;
}

export default function AccountPage() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      setLoggedIn(false);
      return;
    }
    me()
      .then((p) => {
        setProfile(p);
        setLoggedIn(true);
      })
      .catch(() => {
        logout();
        setLoggedIn(false);
      });
  }, []);

  if (loggedIn === null) {
    return <div className="mx-auto max-w-md px-4 py-16 text-center text-muted-foreground">Chargement…</div>;
  }

  if (!loggedIn || !profile) {
    return <AuthForm onSuccess={(p) => { setProfile(p); setLoggedIn(true); }} />;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 md:px-7 py-6">
      <h1 className="font-display text-2xl font-extrabold mb-5">👤 Mon compte</h1>

      <div className="rounded-2xl border border-border bg-gradient-to-br from-brand-highlight-soft to-card p-4 flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <span className="text-xs font-bold uppercase text-brand-highlight-foreground">Programme fidélité</span>
          <p className="font-display text-2xl font-extrabold mt-1">{profile.loyaltyPoints} points</p>
          <p className="text-xs text-muted-foreground">≈ {dh(Math.round(profile.loyaltyPoints / 10))} de réduction disponible</p>
        </div>
        <Button asChild>
          <Link href="/panier">Utiliser mes points</Link>
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3.5 mb-5">
        <Link href="/compte/commandes" className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
          <div className="flex size-10 items-center justify-center rounded-full bg-brand-primary-soft text-primary">
            <Package className="size-5" />
          </div>
          <div>
            <p className="font-bold text-sm">Mes commandes</p>
            <p className="text-xs text-muted-foreground">{profile.ordersCount} commande{profile.ordersCount > 1 ? "s" : ""}</p>
          </div>
        </Link>
        <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-brand-highlight-soft text-brand-highlight-foreground">
            <Star className="size-5" />
          </div>
          <div>
            <p className="font-bold text-sm">Total dépensé</p>
            <p className="text-xs text-muted-foreground">{dh(profile.totalSpent)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="font-bold mb-3.5">Informations personnelles</h3>
        <div className="grid sm:grid-cols-2 gap-3.5 text-sm">
          <div>
            <p className="text-xs font-bold text-muted-foreground mb-1">Nom complet</p>
            <p>{profile.firstName} {profile.lastName}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-muted-foreground mb-1">Téléphone</p>
            <p>{profile.phone ?? "—"}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-bold text-muted-foreground mb-1">Email</p>
            <p>{profile.email ?? "—"}</p>
          </div>
        </div>
      </div>

      <Button
        variant="ghost"
        className="mt-5 text-muted-foreground"
        onClick={() => {
          logout();
          setLoggedIn(false);
          setProfile(null);
        }}
      >
        <LogOut className="size-4" /> Se déconnecter
      </Button>
    </div>
  );
}

function AuthForm({ onSuccess }: { onSuccess: (profile: CustomerProfile) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    try {
      if (mode === "login") {
        await login({
          identifier: String(form.get("identifier")),
          password: String(form.get("password")),
        });
      } else {
        await register({
          firstName: String(form.get("firstName")),
          lastName: String(form.get("lastName")),
          email: String(form.get("email") || "") || undefined,
          phone: String(form.get("phone") || "") || undefined,
          password: String(form.get("password")),
        });
      }
      const profile = await me();
      onSuccess(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="text-center mb-6">
        <User className="mx-auto size-10 text-primary mb-2" />
        <h1 className="font-display text-2xl font-extrabold">{mode === "login" ? "Connexion" : "Créer un compte"}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {mode === "login" ? "Accédez à vos commandes et vos points fidélité." : "Rejoignez UniversEnfants en quelques secondes."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3.5">
        {mode === "register" && (
          <div className="grid grid-cols-2 gap-3.5">
            <Field label="Nom" name="firstName" required />
            <Field label="Prénom" name="lastName" required />
          </div>
        )}
        {mode === "login" ? (
          <Field label="Email ou téléphone" name="identifier" required placeholder="vous@exemple.com" />
        ) : (
          <>
            <Field label="Email" name="email" type="email" placeholder="vous@exemple.com" />
            <Field label="Téléphone" name="phone" placeholder="06 XX XX XX XX" />
          </>
        )}
        <Field label="Mot de passe" name="password" type="password" required />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" variant="cta" disabled={submitting}>
          {submitting ? "Veuillez patienter…" : mode === "login" ? "Se connecter" : "Créer mon compte"}
        </Button>
      </form>

      <button
        onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}
        className="w-full text-center text-sm font-bold text-primary mt-4"
      >
        {mode === "login" ? "Pas encore de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
      </button>
    </div>
  );
}

function Field({ label, name, required, placeholder, type = "text" }: { label: string; name: string; required?: boolean; placeholder?: string; type?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-muted-foreground">{label} {required && "*"}</label>
      <input name={name} type={type} required={required} placeholder={placeholder} className="rounded-lg border border-border px-3 py-2.5 text-sm" />
    </div>
  );
}
