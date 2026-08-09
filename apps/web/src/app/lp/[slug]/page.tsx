import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LANDING_THEME_STYLES, type LandingTheme } from "@universenfants/shared";
import { getLandingPageBySlug } from "@/lib/landing-pages-client";
import { VisitTracker } from "@/components/landing/visit-tracker";
import { ProductShowcase } from "@/components/landing/product-showcase";
import { BlockRenderer, type BodyBlock } from "@/components/landing/block-renderer";
import { InlineCta } from "@/components/landing/inline-cta";
import { QuickOrderForm } from "@/components/landing/quick-order-form";
import { StickyCta } from "@/components/landing/sticky-cta";

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
    "--lp-soft": themeStyle.soft,
  } as React.CSSProperties;

  // "hero" et "gallery" alimentent la vitrine produit fixe en haut de page ;
  // le reste (description, advantages, trust, testimonials, faq) est le
  // corps de page, dans l'ordre configuré par l'admin.
  const hero = page.blocks.find((b) => b.type === "hero");
  const galleryBlock = page.blocks.find((b) => b.type === "gallery");
  const bodyBlocks = page.blocks.filter((b): b is BodyBlock => b.type !== "hero" && b.type !== "gallery");

  const galleryImages = galleryBlock?.images.length ? galleryBlock.images : page.product.images.map((i) => i.url);
  const showcaseTitle = hero?.title || page.product.nameFr;

  // Un 2e CTA après le premier bloc "avantages"/"réassurance" rencontré,
  // pour que le bouton apparaisse à plusieurs endroits (§CTA et conversion).
  const inlineCtaIndex = bodyBlocks.findIndex((b) => b.type === "advantages" || b.type === "trust");

  return (
    <div className="min-h-screen pb-24 md:pb-8" style={{ ...cssVars, background: "var(--lp-soft)" }}>
      <VisitTracker slug={page.slug} />

      <ProductShowcase
        images={galleryImages}
        videoUrl={hero?.videoUrl}
        title={showcaseTitle}
        subtitle={hero?.subtitle}
        price={price}
        compareAt={compareAt}
        ctaLabel={ctaLabel}
        countdownEndAt={page.countdownEnabled ? page.countdownEndAt : null}
      />

      {bodyBlocks.map((block, i) => (
        <div key={i}>
          <BlockRenderer block={block} />
          {i === inlineCtaIndex && <InlineCta label={ctaLabel} />}
        </div>
      ))}

      <section className="px-5 py-6 max-w-md mx-auto">
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
