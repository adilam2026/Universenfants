"use client";

import { useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { GUIDES } from "@/lib/guides-content";

// Zone éditoriale nettement plus visuelle que la rangée de cartes compactes
// existante (icône + texte) : grandes cartes façon mini-bannières, motif
// illustratif surdimensionné en superposition dégradée — même convention
// que HeroCarousel (dégradé sombre en bas pour la lisibilité du texte sur
// fond illustré) pour rester cohérent avec l'identité graphique du site.
//
// Pas de vraie photographie ici : aucun visuel réel (parent/enfant qui
// jouent, activité créative...) n'est disponible dans ce projet — en
// inventer un serait présenter une image trompeuse. `guide.gradient` +
// `guide.emoji` (déjà utilisés pour /guides et le teaser homepage) servent
// de repli illustratif haut de gamme ; le composant est prêt à afficher une
// vraie photo dès qu'un champ `coverImage` existe côté contenu.
export function GuidesCarousel() {
  const t = useTranslations("guides");
  const currentLocale = useLocale();
  const scrollerRef = useRef<HTMLDivElement>(null);

  function scrollByCard(direction: 1 | -1) {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-carousel-card]");
    const step = (card?.offsetWidth ?? el.clientWidth * 0.8) + 16;
    el.scrollBy({ left: direction * step, behavior: "smooth" });
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3.5">
        <div>
          <h2 className="font-display text-xl font-extrabold">{t("carouselTitle")}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{t("carouselSubtitle")}</p>
        </div>
        <div className="hidden md:flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => scrollByCard(-1)}
            aria-label={t("carouselPrev")}
            className="flex size-8 items-center justify-center rounded-full border border-border hover:border-primary hover:text-primary"
          >
            <ChevronLeft className="size-4 rtl:rotate-180" />
          </button>
          <button
            type="button"
            onClick={() => scrollByCard(1)}
            aria-label={t("carouselNext")}
            className="flex size-8 items-center justify-center rounded-full border border-border hover:border-primary hover:text-primary"
          >
            <ChevronRight className="size-4 rtl:rotate-180" />
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 md:mx-0 md:px-0 [scrollbar-width:none]"
      >
        {GUIDES.map((guide) => {
          const content = guide[currentLocale === "ar" ? "ar" : "fr"];
          return (
            <Link
              key={guide.slug}
              href={`/guides/${guide.slug}`}
              data-carousel-card
              className="group relative shrink-0 w-[78%] sm:w-[45%] md:w-[31%] lg:w-[23%] aspect-[4/5] snap-start overflow-hidden rounded-3xl shadow-sm"
              style={{ background: guide.gradient }}
            >
              <span
                aria-hidden
                className="absolute -bottom-6 -right-6 rtl:right-auto rtl:-left-6 rotate-[-10deg] text-[9rem] leading-none opacity-25 select-none"
              >
                {guide.emoji}
              </span>
              <span
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent"
              />
              <div className="relative z-10 flex h-full flex-col justify-end p-4 text-white">
                <span className="text-3xl mb-2">{guide.emoji}</span>
                <h3 className="font-display font-extrabold text-base leading-snug text-balance">{content.title}</h3>
                <p className="text-xs text-white/85 mt-1 line-clamp-2">{content.excerpt}</p>
                <span className="mt-3 inline-flex w-fit items-center gap-1 rounded-full bg-white/20 backdrop-blur px-3 py-1.5 text-xs font-bold group-hover:bg-white/30 transition-colors">
                  {t("cardCta")} <ArrowRight className="size-3.5 rtl:rotate-180" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      <Link
        href="/guides"
        className="mt-3.5 inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:opacity-80"
      >
        {t("carouselCta")} <ArrowRight className="size-4 rtl:rotate-180" />
      </Link>
    </section>
  );
}
