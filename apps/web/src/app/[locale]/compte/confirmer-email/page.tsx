"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCircle2, XCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { confirmEmailChange } from "@/lib/auth-client";

export default function ConfirmEmailChangePage() {
  // useSearchParams() exige une frontière Suspense en page top-level (voir
  // mot-de-passe/reinitialiser/page.tsx pour le même motif).
  return (
    <Suspense>
      <ConfirmEmailChangeContent />
    </Suspense>
  );
}

function ConfirmEmailChangeContent() {
  const t = useTranslations("account");
  const token = useSearchParams().get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">(token ? "loading" : "error");
  const [newEmail, setNewEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    confirmEmailChange(token)
      .then((result) => {
        setNewEmail(result.email);
        setStatus("success");
      })
      .catch(() => setStatus("error"));
  }, [token]);

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      {status === "loading" && (
        <>
          <Mail className="mx-auto size-10 text-primary mb-3 animate-pulse" />
          <p className="text-sm text-muted-foreground">{t("confirmEmailLoading")}</p>
        </>
      )}
      {status === "success" && (
        <>
          <CheckCircle2 className="mx-auto size-10 text-brand-success mb-3" />
          <h1 className="font-display text-xl font-extrabold mb-1">{t("confirmEmailTitle")}</h1>
          <p className="text-sm text-muted-foreground mb-4">{t("confirmEmailSuccess", { email: newEmail ?? "" })}</p>
          <Button asChild variant="cta">
            <Link href="/compte">{t("backToAccount")}</Link>
          </Button>
        </>
      )}
      {status === "error" && (
        <>
          <XCircle className="mx-auto size-10 text-destructive mb-3" />
          <h1 className="font-display text-xl font-extrabold mb-1">{t("confirmEmailTitle")}</h1>
          <p className="text-sm text-destructive mb-4">{t("confirmEmailError")}</p>
          <Button asChild variant="cta">
            <Link href="/compte">{t("backToAccount")}</Link>
          </Button>
        </>
      )}
    </div>
  );
}
