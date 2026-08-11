"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { Gift, Cake, Sparkles, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { localized } from "@/lib/localized";
import { cn } from "@/lib/utils";
import type { HeroBanner } from "@/lib/api";

interface Slide {
  key: "giftAdvisor" | "birthdayList" | "promotions";
  icon: LucideIcon;
  href: string;
  gradient: string;
}

const SLIDES: Slide[] = [
  {
    key: "giftAdvisor",
    icon: Gift,
    href: "/conseiller-cadeau",
    gradient: "linear-gradient(135deg, var(--primary), var(--brand-primary-strong))",
  },
  {
    key: "birthdayList",
    icon: Cake,
    href: "/liste-anniversaire",
    gradient: "linear-gradient(135deg, var(--brand-cta-hover), var(--brand-cta))",
  },
  {
    key: "promotions",
    icon: Sparkles,
    href: "/recherche?promo=1",
    gradient: "linear-gradient(135deg, var(--brand-warning), #efb870)",
  },
];

/** Sans aucune bannière configurée dans le Back-Office (nouveau site, ou
 * admin n'ayant pas encore rempli la section Bannières), la home retombe
 * sur ces 3 cartes illustrées plutôt que d'afficher un espace vide. */
export function HeroCarousel({ banners = [] }: { banners?: HeroBanner[] }) {
  const t = useTranslations("hero");
  const locale = useLocale();
  const [index, setIndex] = useState(0);
  const count = banners.length > 0 ? banners.length : SLIDES.length;

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % count), 5000);
    return () => clearInterval(id);
  }, [count]);

  // Swipe tactile : suit le doigt via Pointer Events (touch + souris/pen en
  // un seul jeu de handlers). `touch-action: pan-y` laisse le scroll
  // vertical de la page passer nativement pendant qu'on capture le geste
  // horizontal en JS. Un swipe réel (au-delà du seuil) intercepte le clic
  // qui suit — via `onClickCapture`, avant qu'il n'atteigne le CTA/lien —
  // pour qu'un swipe ne déclenche jamais accidentellement une navigation.
  const swipeStartX = useRef<number | null>(null);
  const swipeDeltaX = useRef(0);
  const wasSwipe = useRef(false);
  const SWIPE_THRESHOLD = 40;

  function handlePointerDown(e: React.PointerEvent) {
    swipeStartX.current = e.clientX;
    swipeDeltaX.current = 0;
    wasSwipe.current = false;
  }
  function handlePointerMove(e: React.PointerEvent) {
    if (swipeStartX.current === null) return;
    swipeDeltaX.current = e.clientX - swipeStartX.current;
  }
  function handlePointerUp() {
    if (swipeStartX.current === null) return;
    if (Math.abs(swipeDeltaX.current) > SWIPE_THRESHOLD) {
      wasSwipe.current = true;
      setIndex((i) => (swipeDeltaX.current < 0 ? (i + 1) % count : (i - 1 + count) % count));
    }
    swipeStartX.current = null;
    swipeDeltaX.current = 0;
  }
  function handleClickCapture(e: React.MouseEvent) {
    if (wasSwipe.current) {
      e.preventDefault();
      e.stopPropagation();
      wasSwipe.current = false;
    }
  }

  const swipeHandlers = {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerUp,
    onClickCapture: handleClickCapture,
    style: { touchAction: "pan-y" as const },
  };

  if (banners.length > 0) {
    return (
      <div className="relative h-[250px] md:h-[340px] overflow-hidden rounded-3xl" {...swipeHandlers}>
        {banners.map((banner, i) => {
          const title = localized(banner.titleFr, banner.titleAr, locale);
          const subtitle = localized(banner.subtitleFr ?? "", banner.subtitleAr, locale);
          const content = (
            <div
              className={cn(
                "absolute inset-0 transition-opacity duration-700",
                i === index ? "opacity-100" : "opacity-0 pointer-events-none",
              )}
            >
              <Image src={banner.imageDesktop} alt={title} fill sizes="100vw" className="object-cover" priority={i === 0} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              <div className="relative z-10 h-full flex items-end px-6 md:px-12 pb-8 max-w-md text-white">
                <div>
                  <h1 className="font-display text-2xl md:text-4xl font-extrabold text-balance">{title}</h1>
                  {subtitle && <p className="mt-2 text-sm text-white/90">{subtitle}</p>}
                </div>
              </div>
            </div>
          );
          return banner.link ? (
            <Link key={banner.id} href={banner.link} className="absolute inset-0">
              {content}
            </Link>
          ) : (
            <div key={banner.id}>{content}</div>
          );
        })}
        <CarouselDots count={banners.length} index={index} onSelect={setIndex} t={t} />
      </div>
    );
  }

  return (
    <div className="relative h-[250px] md:h-[340px] overflow-hidden rounded-3xl" {...swipeHandlers}>
      {SLIDES.map((slide, i) => (
        <div
          key={slide.key}
          className={cn(
            "absolute inset-0 flex items-center transition-opacity duration-700",
            i === index ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
          style={{ background: slide.gradient }}
        >
          <slide.icon className="absolute right-[4%] rtl:right-auto rtl:left-[4%] top-1/2 -translate-y-1/2 size-28 md:size-40 text-white/90" strokeWidth={1.2} />
          <div className="absolute -top-16 -right-12 rtl:right-auto rtl:-left-12 size-48 rounded-full bg-white/15" />
          <div className="absolute -bottom-12 right-[10%] rtl:right-auto rtl:left-[10%] size-32 rounded-full bg-white/10" />
          <div className="relative z-10 max-w-md px-6 md:px-12 text-white">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold">
              <slide.icon className="size-3.5" /> {t(`${slide.key}.eyebrow`)}
            </span>
            <h1 className="mt-2.5 font-display text-2xl md:text-4xl font-extrabold text-balance">{t(`${slide.key}.title`)}</h1>
            <p className="mt-2 text-sm text-white/90">{t(`${slide.key}.text`)}</p>
            <Button asChild variant="cta" size="sm" className="mt-3.5">
              <Link href={slide.href}>{t(`${slide.key}.cta`)}</Link>
            </Button>
          </div>
        </div>
      ))}
      <CarouselDots count={SLIDES.length} index={index} onSelect={setIndex} t={t} />
    </div>
  );
}

function CarouselDots({
  count,
  index,
  onSelect,
  t,
}: {
  count: number;
  index: number;
  onSelect: (i: number) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="absolute bottom-4 left-6 rtl:left-auto rtl:right-6 z-10 flex gap-1.5">
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          aria-label={t("slideLabel", { n: i + 1 })}
          className={cn("h-2 rounded-full bg-white/45 transition-all", i === index ? "w-5 bg-white" : "w-2")}
        />
      ))}
    </div>
  );
}
