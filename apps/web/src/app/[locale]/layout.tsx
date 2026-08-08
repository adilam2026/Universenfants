import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import "../globals.css";
import { routing } from "@/i18n/routing";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

// Polices système (pas de next/font/google : aucune dépendance réseau au
// build, cohérent avec la direction artistique validée en Phase 1).
const fontVars =
  "[--font-family-display:ui-rounded,'SF_Pro_Rounded','Segoe_UI_Rounded',Nunito,system-ui,sans-serif] [--font-family-sans:-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,system-ui,sans-serif]";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: { default: t("titleDefault"), template: `%s · ${t("brand")}` },
    description: t("description"),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} className={`h-full antialiased ${fontVars}`}>
      <body className="min-h-full flex flex-col font-sans">
        <NextIntlClientProvider>
          <Suspense>
            <SiteHeader />
          </Suspense>
          <main className="flex-1 pb-20 md:pb-0">{children}</main>
          <SiteFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
