"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { forgotPassword } from "@/lib/auth-client";

export default function ForgotPasswordPage() {
  const t = useTranslations("account");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    try {
      await forgotPassword(String(form.get("email")));
      setSent(true);
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
        <h1 className="font-display text-2xl font-extrabold">{t("forgotPasswordTitle")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("forgotPasswordSubtitle")}</p>
      </div>

      {sent ? (
        <p className="rounded-2xl border border-border bg-card p-4 text-sm text-center">{t("resetLinkSent")}</p>
      ) : (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-muted-foreground">{t("email")}</label>
            <input name="email" type="email" required placeholder={t("identifierPlaceholder")} className="rounded-lg border border-border px-3 py-2.5 text-sm" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" variant="cta" disabled={submitting}>
            {submitting ? t("submitting") : t("sendResetLink")}
          </Button>
        </form>
      )}

      <Link href="/compte" className="block w-full text-center text-sm font-bold text-primary mt-4">
        {t("backToLogin")}
      </Link>
    </div>
  );
}
