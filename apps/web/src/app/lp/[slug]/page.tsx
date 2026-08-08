import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LANDING_THEME_STYLES, type LandingTheme } from "@universenfants/shared";
import { getLandingPageBySlug } from "@/lib/landing-pages-client";
import { VisitTracker } from "@/components/landing/visit-tracker";
import { CountdownTimer } from "@/components/landing/countdown-timer";
import { BlockRenderer } from "@/components/landing/block-renderer";
import { QuickOrderForm } from "@/components/landing/quick-order-form";
import { StickyCta } from "@/components/landing/sticky-cta";

function dh(value: string | number) {
  return `${Number(value).toLocaleString("fr-FR")} DH`;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await getLandingPageBySlug(slug);
  return { title: page?.name ?? "Offre spéciale" };
}

export default async function LandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getLandingPageBySlug(slug);
  if (!page) notFound();

  const themeStyle = LANDING_THEME_STYLES[page.theme as LandingTheme] ?? LANDING_THEME_STYLES.universenfants;
  const price = Number(page.displayPrice ?? page.product.promoPrice ?? page.product.price);
  const compareAt = page.compareAtPrice ? Number(page.compareAtPrice) : page.product.promoPrice ? Number(page.product.price) : null;
  const ctaLabel = page.ctaLabel || "Commander maintenant";

  const cssVars = {
    "--lp-primary": page.primaryColor || themeStyle.primary,
    "--lp-secondary": page.secondaryColor || themeStyle.secondary,
    "--lp-cta": page.ctaColor || themeStyle.cta,
  } as React.CSSProperties;

  const showCountdown = page.countdownEnabled && page.countdownEndAt;

  return (
    <div style={cssVars} className="min-h-screen bg-white pb-24 md:pb-8">
      <VisitTracker slug={page.slug} />
      {showCountdown && <CountdownTimer endAt={page.countdownEndAt!} />}

      {page.blocks.map((block, i) => (
        <BlockRenderer key={i} block={block} />
      ))}

      <section className="px-5 py-6 max-w-md mx-auto text-center">
        <div className="flex items-baseline justify-center gap-3 mb-1">
          <span className="text-3xl font-extrabold" style={{ color: "var(--lp-primary)" }}>{dh(price)}</span>
          {compareAt && compareAt > price && <span className="text-lg text-muted-foreground line-through">{dh(compareAt)}</span>}
        </div>
        {compareAt && compareAt > price && (
          <p className="text-sm font-bold text-brand-success">
            Économisez {dh(compareAt - price)} (-{Math.round((1 - price / compareAt) * 100)}%)
          </p>
        )}
      </section>

      <section className="px-5 max-w-md mx-auto">
        <QuickOrderForm
          slug={page.slug}
          requireAddress={page.requireAddress}
          ctaLabel={ctaLabel}
          successPhone={page.successPhone}
          successWhatsapp={page.successWhatsapp}
          successHours={page.successHours}
        />
      </section>

      <StickyCta label={ctaLabel} />
    </div>
  );
}
