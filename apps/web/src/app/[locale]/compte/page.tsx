"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Star, Package, LogOut, User, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import {
  login,
  register,
  logout,
  me,
  updateProfile,
  requestEmailChange,
  type CustomerProfile,
} from "@/lib/auth-client";
import { useIsLoggedIn } from "@/hooks/use-is-logged-in";
import { useStoreSettings } from "@/hooks/use-store-settings";

function dh(value: string | number) {
  return `${Number(value).toLocaleString("fr-FR")} DH`;
}

export default function AccountPage() {
  const t = useTranslations("account");
  const loggedIn = useIsLoggedIn();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const storeSettings = useStoreSettings();
  const loyaltyRate = storeSettings?.settings.loyaltyRedeemRate ?? null;

  useEffect(() => {
    if (loggedIn !== true) return;
    me()
      .then(setProfile)
      .catch(() => logout());
  }, [loggedIn]);

  if (loggedIn === null || (loggedIn && !profile)) {
    return <div className="mx-auto max-w-md px-4 py-16 text-center text-muted-foreground">{t("loading")}</div>;
  }

  if (!loggedIn || !profile) {
    return <AuthForm onSuccess={setProfile} />;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 md:px-7 py-6">
      <h1 className="font-display text-2xl font-extrabold mb-5">{t("title")}</h1>

      <div className="rounded-2xl border border-border bg-gradient-to-br from-brand-highlight-soft to-card p-4 flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <span className="text-xs font-bold uppercase text-brand-highlight-foreground">{t("loyaltyProgram")}</span>
          <p className="font-display text-2xl font-extrabold mt-1">{t("points", { n: profile.loyaltyPoints })}</p>
          {loyaltyRate !== null && (
            <p className="text-xs text-muted-foreground">{t("discountAvailable", { amount: dh(Math.round(profile.loyaltyPoints / loyaltyRate)) })}</p>
          )}
        </div>
        <Button asChild>
          <Link href="/panier">{t("usePoints")}</Link>
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3.5 mb-5">
        <Link href="/compte/commandes" className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
          <div className="flex size-10 items-center justify-center rounded-full bg-brand-primary-soft text-primary">
            <Package className="size-5" />
          </div>
          <div>
            <p className="font-bold text-sm">{t("myOrders")}</p>
            <p className="text-xs text-muted-foreground">{profile.ordersCount} {t("orderCount", { n: profile.ordersCount })}</p>
          </div>
        </Link>
        <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-brand-highlight-soft text-brand-highlight-foreground">
            <Star className="size-5" />
          </div>
          <div>
            <p className="font-bold text-sm">{t("totalSpent")}</p>
            <p className="text-xs text-muted-foreground">{dh(profile.totalSpent)}</p>
          </div>
        </div>
      </div>

      <PersonalInfoCard profile={profile} onChanged={setProfile} />

      <Button
        variant="ghost"
        className="mt-5 text-muted-foreground"
        onClick={() => {
          logout();
          setProfile(null);
        }}
      >
        <LogOut className="size-4" /> {t("logout")}
      </Button>
    </div>
  );
}

function PersonalInfoCard({ profile, onChanged }: { profile: CustomerProfile; onChanged: (profile: CustomerProfile) => void }) {
  const t = useTranslations("account");
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function startEdit() {
    setFirstName(profile.firstName);
    setLastName(profile.lastName);
    setPhone(profile.phone ?? "");
    setPassword("");
    setError(null);
    setEditing(true);
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await updateProfile({
        firstName,
        lastName,
        phone: phone || undefined,
        password: password || undefined,
      });
      onChanged(updated);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setSaving(false);
    }
  }

  const phoneChanged = phone !== (profile.phone ?? "");

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3.5">
        <h3 className="font-bold">{t("personalInfo")}</h3>
        {!editing && (
          <button onClick={startEdit} className="flex items-center gap-1 text-xs font-bold text-primary">
            <Pencil className="size-3.5" /> {t("editProfile")}
          </button>
        )}
      </div>

      {editing ? (
        <form onSubmit={save} className="flex flex-col gap-3.5 text-sm">
          <div className="grid sm:grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-muted-foreground">{t("firstName")}</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="rounded-lg border border-border px-3 py-2.5 text-sm" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-muted-foreground">{t("lastName")}</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} required className="rounded-lg border border-border px-3 py-2.5 text-sm" />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-muted-foreground">{t("phone")}</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("phonePlaceholder")} className="rounded-lg border border-border px-3 py-2.5 text-sm" />
            </div>
            {phoneChanged && (
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-muted-foreground">{t("currentPassword")}</label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  required
                  className="rounded-lg border border-border px-3 py-2.5 text-sm"
                />
                <p className="text-[11px] text-muted-foreground">{t("currentPasswordForPhone")}</p>
              </div>
            )}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? t("submitting") : t("save")}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
              {t("cancel")}
            </Button>
          </div>
        </form>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3.5 text-sm">
          <div>
            <p className="text-xs font-bold text-muted-foreground mb-1">{t("fullName")}</p>
            <p>{profile.firstName} {profile.lastName}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-muted-foreground mb-1">{t("phone")}</p>
            <p>{profile.phone ?? "—"}</p>
          </div>
          {saved && <p className="text-xs font-bold text-brand-success sm:col-span-2">{t("saved")}</p>}
        </div>
      )}

      <div className="border-t border-border mt-3.5 pt-3.5">
        <EmailChangeSection profile={profile} onChanged={onChanged} />
      </div>
    </div>
  );
}

function EmailChangeSection({ profile, onChanged }: { profile: CustomerProfile; onChanged: (profile: CustomerProfile) => void }) {
  const t = useTranslations("account");
  const [editing, setEditing] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestedFor, setRequestedFor] = useState<string | null>(null);

  async function handleRequest(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await requestEmailChange(newEmail, password);
      setRequestedFor(newEmail);
      setEditing(false);
      onChanged({ ...profile, pendingEmail: newEmail });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setSubmitting(false);
    }
  }

  const pending = profile.pendingEmail;

  return (
    <div className="text-sm">
      <p className="text-xs font-bold text-muted-foreground mb-1">{t("email")}</p>
      <p>{profile.email ?? "—"}</p>
      {requestedFor && <p className="text-xs text-brand-success mt-1">{t("emailChangeRequested", { email: requestedFor })}</p>}
      {!requestedFor && pending && <p className="text-xs text-brand-highlight-foreground mt-1">{t("pendingEmailNotice", { email: pending })}</p>}

      {editing ? (
        <form onSubmit={handleRequest} className="flex flex-col gap-2.5 mt-2.5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-muted-foreground">{t("newEmail")}</label>
            <input
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              type="email"
              required
              className="rounded-lg border border-border px-3 py-2.5 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-muted-foreground">{t("currentPasswordForEmail")}</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              className="rounded-lg border border-border px-3 py-2.5 text-sm"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? t("submitting") : t("requestEmailChangeButton")}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
              {t("cancel")}
            </Button>
          </div>
        </form>
      ) : (
        <button onClick={() => { setEditing(true); setError(null); }} className="flex items-center gap-1 text-xs font-bold text-primary mt-1.5">
          <Pencil className="size-3.5" /> {t("changeEmail")}
        </button>
      )}
    </div>
  );
}

function AuthForm({ onSuccess }: { onSuccess: (profile: CustomerProfile) => void }) {
  const t = useTranslations("account");
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
        <h1 className="font-display text-2xl font-extrabold">{mode === "login" ? t("login") : t("register")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {mode === "login" ? t("loginSubtitle") : t("registerSubtitle")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3.5">
        {mode === "register" && (
          <div className="grid grid-cols-2 gap-3.5">
            <Field label={t("firstName")} name="firstName" required />
            <Field label={t("lastName")} name="lastName" required />
          </div>
        )}
        {mode === "login" ? (
          <Field label={t("identifier")} name="identifier" required placeholder={t("identifierPlaceholder")} />
        ) : (
          <>
            <Field label={t("email")} name="email" type="email" placeholder={t("identifierPlaceholder")} />
            <Field label={t("phone")} name="phone" placeholder={t("phonePlaceholder")} />
          </>
        )}
        <Field label={t("password")} name="password" type="password" required />
        {mode === "login" && (
          <Link href="/mot-de-passe/oublie" className="text-xs font-bold text-primary -mt-2 self-end">
            {t("forgotPassword")}
          </Link>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" variant="cta" disabled={submitting}>
          {submitting ? t("submitting") : mode === "login" ? t("submitLogin") : t("submitRegister")}
        </Button>
      </form>

      <button
        onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}
        className="w-full text-center text-sm font-bold text-primary mt-4"
      >
        {mode === "login" ? t("switchToRegister") : t("switchToLogin")}
      </button>
    </div>
  );
}

function Field({ label, name, required, placeholder, type = "text" }: { label: string; name: string; required?: boolean; placeholder?: string; type?: string }) {
  const id = `account-${name}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-bold text-muted-foreground">{label} {required && "*"}</label>
      <input id={id} name={name} type={type} required={required} placeholder={placeholder} className="rounded-lg border border-border px-3 py-2.5 text-sm" />
    </div>
  );
}
