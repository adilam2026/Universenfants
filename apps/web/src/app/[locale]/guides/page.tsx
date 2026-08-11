import type { Metadata } from "next";
import { getTranslations, getLocale, setRequestLocale } from "next-intl/server";
import { GUIDES } from "@/lib/guides-content";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({ params }: PageProps<"/[locale]/guides">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "guides" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function GuidesIndexPage({ params }: PageProps<"/[locale]/guides">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("guides");
  const currentLocale = await getLocale();

  return (
    <div className="mx-auto max-w-5xl px-4 md:px-7 py-6">
      <h1 className="font-display text-2xl font-extrabold mb-1.5">{t("title")}</h1>
      <p className="text-sm text-muted-foreground mb-6 max-w-2xl">{t("subtitle")}</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {GUIDES.map((guide) => {
          const content = guide[currentLocale === "ar" ? "ar" : "fr"];
          return (
            <Link
              key={guide.slug}
              href={`/guides/${guide.slug}`}
              className="group flex flex-col rounded-2xl border border-border bg-card overflow-hidden hover:border-primary transition-colors"
            >
              <div
                className="flex h-28 items-center justify-center text-4xl"
                style={{ background: guide.gradient }}
              >
                {guide.emoji}
              </div>
              <div className="flex flex-col gap-1.5 p-4">
                <h2 className="font-display font-extrabold text-sm leading-snug group-hover:text-primary">
                  {content.title}
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{content.excerpt}</p>
                <span className="text-[11px] font-bold text-muted-foreground mt-1">
                  {t("readTime", { n: content.readMinutes })}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
