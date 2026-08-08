"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Gift, Cake, Sparkles, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Slide {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  text: string;
  cta: string;
  href: string;
  gradient: string;
}

const SLIDES: Slide[] = [
  {
    icon: Gift,
    eyebrow: "Conseiller Cadeau",
    title: "Trouver le cadeau idéal en 30 secondes",
    text: "Répondez à quelques questions et trouvez le cadeau parfait selon l'âge, le budget et l'occasion.",
    cta: "Trouver un cadeau",
    href: "/conseiller-cadeau",
    gradient: "linear-gradient(135deg, var(--primary), var(--brand-primary-strong))",
  },
  {
    icon: Cake,
    eyebrow: "Liste Anniversaire",
    title: "Créez une liste anniversaire",
    text: "Partagez votre liste avec la famille et évitez les cadeaux en double grâce à la réservation.",
    cta: "Créer ma liste",
    href: "/liste-anniversaire",
    gradient: "linear-gradient(135deg, var(--brand-cta-hover), var(--brand-cta))",
  },
  {
    icon: Sparkles,
    eyebrow: "Offres du moment",
    title: "Promotions du moment",
    text: "Découvrez nos meilleures offres et nouveautés, jusqu'à -25% sur une sélection de jouets.",
    cta: "Voir les promotions",
    href: "/categorie/construction",
    gradient: "linear-gradient(135deg, var(--brand-warning), #efb870)",
  },
];

export function HeroCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative h-[250px] md:h-[340px] overflow-hidden rounded-3xl">
      {SLIDES.map((slide, i) => (
        <div
          key={slide.title}
          className={cn(
            "absolute inset-0 flex items-center transition-opacity duration-700",
            i === index ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
          style={{ background: slide.gradient }}
        >
          <slide.icon className="absolute right-[4%] top-1/2 -translate-y-1/2 size-28 md:size-40 text-white/90" strokeWidth={1.2} />
          <div className="absolute -top-16 -right-12 size-48 rounded-full bg-white/15" />
          <div className="absolute -bottom-12 right-[10%] size-32 rounded-full bg-white/10" />
          <div className="relative z-10 max-w-md px-6 md:px-12 text-white">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold">
              <slide.icon className="size-3.5" /> {slide.eyebrow}
            </span>
            <h1 className="mt-2.5 font-display text-2xl md:text-4xl font-extrabold text-balance">{slide.title}</h1>
            <p className="mt-2 text-sm text-white/90">{slide.text}</p>
            <Button asChild variant="cta" size="sm" className="mt-3.5">
              <Link href={slide.href}>{slide.cta}</Link>
            </Button>
          </div>
        </div>
      ))}
      <div className="absolute bottom-4 left-6 z-10 flex gap-1.5">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.title}
            onClick={() => setIndex(i)}
            aria-label={`Diapositive ${i + 1}`}
            className={cn("h-2 rounded-full bg-white/45 transition-all", i === index ? "w-5 bg-white" : "w-2")}
          />
        ))}
      </div>
    </div>
  );
}
