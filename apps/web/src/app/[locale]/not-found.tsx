import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("notFoundPage");

  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="text-6xl mb-4">🧸</p>
      <h1 className="font-display text-2xl font-extrabold mb-2">{t("title")}</h1>
      <p className="text-sm text-muted-foreground mb-6">{t("description")}</p>
      <Link
        href="/"
        className="inline-flex items-center justify-center rounded-full bg-brand-cta text-brand-cta-foreground px-6 py-3 text-sm font-bold"
      >
        {t("cta")}
      </Link>
    </div>
  );
}
