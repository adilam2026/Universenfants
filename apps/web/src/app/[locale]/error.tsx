"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errorBoundary");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center px-4 py-24">
      <div className="max-w-md text-center">
        <p className="text-6xl mb-4">🧸</p>
        <h1 className="text-2xl font-extrabold mb-2">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mb-6">{t("description")}</p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center rounded-full bg-brand-cta text-brand-cta-foreground px-6 py-3 text-sm font-bold"
          >
            {t("retry")}
          </button>
          <Link href="/" className="inline-flex items-center justify-center rounded-full border px-6 py-3 text-sm font-bold">
            {t("home")}
          </Link>
        </div>
      </div>
    </div>
  );
}
