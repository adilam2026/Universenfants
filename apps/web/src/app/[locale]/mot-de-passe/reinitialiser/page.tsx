"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { resetPassword } from "@/lib/auth-client";

export default function ResetPasswordPage() {
  const t = useTranslations("account");
  const token = useSearchParams().get("token");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    try {
      await resetPassword(token, String(form.get("password")));
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="text-center mb-6">
        <KeyRound className="mx-auto size-10 text-primary mb-2" />
        <h1 className="font-display text-2xl font-extrabold">{t("resetPasswordTitle")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("resetPasswordSubtitle")}</p>
      </div>

      {!token ? (
        <p className="rounded-2xl border border-border bg-card p-4 text-sm text-center text-destructive">{t("invalidToken")}</p>
      ) : done ? (
        <div className="rounded-2xl border border-border bg-card p-4 text-sm text-center flex flex-col gap-3">
          <p>{t("resetSuccess")}</p>
          <Button asChild variant="cta">
            <Link href="/compte">{t("resetSuccessCta")}</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-muted-foreground">{t("newPassword")}</label>
            <input name="password" type="password" required minLength={8} className="rounded-lg border border-border px-3 py-2.5 text-sm" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" variant="cta" disabled={submitting}>
            {submitting ? t("submitting") : t("submitReset")}
          </Button>
        </form>
      )}
    </div>
  );
}
