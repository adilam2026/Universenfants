import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations, getLocale, setRequestLocale } from "next-intl/server";
import { getGuide, GUIDES } from "@/lib/guides-content";
import { getProductBySlug, type ProductSummary } from "@/lib/api";
import { ProductCard } from "@/components/product-card";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/guides/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return {};
  const content = guide[locale === "ar" ? "ar" : "fr"];
  return { title: content.title, description: content.excerpt, openGraph: { title: content.title, description: content.excerpt } };
}

export default async function GuideDetailPage({ params }: PageProps<"/[locale]/guides/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const guide = getGuide(slug);
  if (!guide) notFound();
  const t = await getTranslations("guides");
  const currentLocale = await getLocale();
  const content = guide[currentLocale === "ar" ? "ar" : "fr"];

  // Chaque section référence de vrais seoUrl du catalogue : on résout les
  // produits ici (à la demande, jamais en dur) pour que prix/stock/promo
  // affichés restent exacts. Un produit retiré ou désactivé depuis l'admin
  // disparaît simplement de la section plutôt que de casser la page.
  const sectionsWithProducts = await Promise.all(
    content.sections.map(async (section) => {
      if (!section.productSlugs || section.productSlugs.length === 0) return { ...section, products: [] as ProductSummary[] };
      const products = await Promise.all(section.productSlugs.map((s) => getProductBySlug(s).catch(() => null)));
      return { ...section, products: products.filter((p): p is NonNullable<typeof p> => p !== null) };
    }),
  );

  return (
    <div className="mx-auto max-w-3xl px-4 md:px-7 py-6">
      <p className="text-xs text-muted-foreground mb-3">
        <Link href="/guides" className="hover:text-primary">
          {t("title")}
        </Link>
      </p>
      <div
        className="flex h-32 items-center justify-center rounded-2xl text-5xl mb-5"
        style={{ background: guide.gradient }}
      >
        {guide.emoji}
      </div>
      <h1 className="font-display text-2xl font-extrabold mb-1.5">{content.title}</h1>
      <p className="text-sm text-muted-foreground mb-1">{content.excerpt}</p>
      <p className="text-[11px] font-bold text-muted-foreground mb-6">{t("readTime", { n: content.readMinutes })}</p>

      <div className="flex flex-col gap-7">
        {sectionsWithProducts.map((section, i) => (
          <section key={i}>
            {section.heading && <h2 className="font-display text-lg font-extrabold mb-2">{section.heading}</h2>}
            {section.paragraphs.map((p, j) => (
              <p key={j} className="text-sm text-muted-foreground leading-relaxed mt-1.5 first:mt-0">
                {p}
              </p>
            ))}
            {section.products.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3.5">
                {section.products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-2.5">
        <Link
          href="/conseiller-cadeau"
          className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-4 py-2 text-xs font-bold hover:opacity-90"
        >
          {t("ctaGiftAdvisor")} <ArrowRight className="size-3.5 rtl:rotate-180" />
        </Link>
        <Link
          href="/guides"
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-bold hover:border-primary hover:text-primary"
        >
          {t("allGuides")}
        </Link>
      </div>
    </div>
  );
}
