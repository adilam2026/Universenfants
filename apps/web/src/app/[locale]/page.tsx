import { Truck, Wallet, RotateCcw, Star, Gift, Cake, ArrowRight } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import { getCategoryTree, getProducts, getActiveHeroBanners, getActiveBrands } from "@/lib/api";
import { localized } from "@/lib/localized";
import { ProductCard } from "@/components/product-card";
import { HeroCarousel } from "@/components/hero-carousel";
import { GuidesCarousel } from "@/components/guides-carousel";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

const CATEGORY_STYLE: Record<string, { gradient: string; motif: string }> = {
  construction: { gradient: "linear-gradient(150deg, #8172d6, #5b4cae)", motif: "🧱" },
  poupees: { gradient: "linear-gradient(150deg, #ff8fa3, #e56e85)", motif: "🎀" },
  educatifs: { gradient: "linear-gradient(150deg, #4fae72, #3a8c58)", motif: "🧩" },
  societe: { gradient: "linear-gradient(150deg, #d98a3d, #b5702a)", motif: "🎲" },
  "plein-air": { gradient: "linear-gradient(150deg, #4f9dae, #37788a)", motif: "⚽" },
  bebe: { gradient: "linear-gradient(150deg, #e2707d, #c85562)", motif: "🍼" },
  scolaire: { gradient: "linear-gradient(150deg, #9b7dd6, #7a5cc4)", motif: "🎒" },
};

function SectionTitle({ title, href, seeAll }: { title: string; href?: string; seeAll: string }) {
  return (
    <div className="flex items-center justify-between mb-3.5">
      <h2 className="font-display text-xl font-extrabold">{title}</h2>
      {href && (
        <Button asChild variant="outline" size="sm">
          <Link href={href}>{seeAll}</Link>
        </Button>
      )}
    </div>
  );
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const tNav = await getTranslations("nav");
  const currentLocale = await getLocale();

  const [categories, brands, trending, promo, bestSellers, newest, heroBanners] = await Promise.all([
    getCategoryTree(),
    getActiveBrands().catch(() => []),
    // 5 plutôt que 4 : les grilles ci-dessous montent jusqu'à 5 colonnes sur
    // grand écran (2xl), comme le catalogue — s'arrêter à 4 produits y
    // aurait laissé une 5e colonne vide, un des grands espaces vides que la
    // hiérarchie visuelle doit justement éviter.
    getProducts({ sort: "newest", limit: 5 }),
    getProducts({ promoOnly: true, limit: 5 }),
    getProducts({ sort: "bestsellers", limit: 5 }),
    getProducts({ sort: "newest", limit: 5, page: 1 }),
    // Pas de fallback statique nécessaire côté page : HeroCarousel retombe
    // déjà sur ses slides codées en dur si aucune bannière n'est active.
    getActiveHeroBanners().catch(() => []),
  ]);

  const AGE_TILES = [
    { key: "age0to2", label: tNav("age0to2"), emoji: "🍼", min: 0, max: 2 },
    { key: "age3to5", label: tNav("age3to5"), emoji: "🧸", min: 3, max: 5 },
    { key: "age6to8", label: tNav("age6to8"), emoji: "🧩", min: 6, max: 8 },
    { key: "age9to12", label: tNav("age9to12"), emoji: "🚲", min: 9, max: 12 },
    { key: "age12plus", label: tNav("age12plus"), emoji: "🎯", min: 12, max: undefined },
  ];

  return (
    <div className="mx-auto max-w-7xl 2xl:max-w-[1600px] px-4 md:px-7 py-3 flex flex-col gap-7">
      <HeroCarousel banners={heroBanners} />

      <section className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { icon: Truck, label: t("reassurance.shipping") },
          { icon: Wallet, label: t("reassurance.payment") },
          { icon: RotateCcw, label: t("reassurance.returns") },
          { icon: Star, label: t("reassurance.selected") },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-xs font-bold text-muted-foreground">
            <item.icon className="size-4 shrink-0 text-primary" />
            {item.label}
          </div>
        ))}
      </section>

      <section>
        <SectionTitle title={t("searchByAge")} seeAll={t("seeAll")} />
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
          {AGE_TILES.map((tile) => (
            <Link
              key={tile.key}
              href={`/recherche?ageMin=${tile.min}${tile.max ? `&ageMax=${tile.max}` : ""}`}
              className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 text-center text-xs font-extrabold hover:border-primary"
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-xl">{tile.emoji}</span>
              {tile.label}
            </Link>
          ))}
        </div>
      </section>

      {/* "Explorer par univers" remonté juste sous la recherche par âge — la
          plupart des visiteurs choisissent une direction de navigation (une
          catégorie) avant tout, l'ancienne position (tout en bas de la
          page) obligeait à faire défiler la quasi-totalité de l'accueil
          pour l'atteindre. Ça sert aussi de raccourci catégories immédiat
          sur mobile, juste sous la barre "Tous les jouets / âges" du
          header, plutôt que de dépendre uniquement du tiroir latéral. */}
      <section>
        <SectionTitle title={t("exploreCategories")} seeAll={t("seeAll")} />
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
          {categories.map((cat) => {
            const style = CATEGORY_STYLE[cat.slug] ?? { gradient: "linear-gradient(150deg, var(--primary), var(--brand-primary-strong))", motif: "🧸" };
            return (
              <Link
                key={cat.id}
                href={`/categorie/${cat.slug}`}
                className="relative flex aspect-[10/9] flex-col justify-end overflow-hidden rounded-2xl p-3 text-white shadow-sm"
                style={{ background: style.gradient }}
              >
                <span className="absolute -bottom-2.5 -right-1.5 rtl:right-auto rtl:-left-1.5 rotate-[-8deg] text-5xl opacity-20">{style.motif}</span>
                <span className="relative z-10 text-lg">{cat.image ?? style.motif}</span>
                <span className="relative z-10 text-xs font-extrabold text-balance">{localized(cat.nameFr, cat.nameAr, currentLocale)}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Link href="/conseiller-cadeau" className="flex flex-col justify-end gap-1 rounded-2xl bg-primary p-4 text-primary-foreground min-h-24">
          <Gift className="size-6" />
          <strong className="text-sm">{t("findGift")}</strong>
          <span className="text-xs opacity-85">{t("findGiftSubtitle")}</span>
        </Link>
        <Link href="/liste-anniversaire" className="flex flex-col justify-end gap-1 rounded-2xl bg-brand-cta p-4 text-brand-cta-foreground min-h-24">
          <Cake className="size-6" />
          <strong className="text-sm">{t("birthdayListTile")}</strong>
          <span className="text-xs opacity-85">{t("birthdayListSubtitle")}</span>
        </Link>
      </section>

      <section>
        <SectionTitle title={t("trending")} href="/recherche" seeAll={t("seeAll")} />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5 xl:gap-5">
          {trending.items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* Le parent comme acteur du jeu, pas seulement acheteur : carrousel
          éditorial entre les bannières d'aide à la décision et les blocs
          commerciaux — remplace l'ancienne rangée de 3 cartes compactes
          (mêmes conseils, présentation nettement plus visuelle) plutôt que
          d'empiler deux blocs "conseils" consécutifs sur l'accueil. */}
      <GuidesCarousel />

      <section>
        <SectionTitle title={t("promotions")} href="/recherche?promo=1" seeAll={t("seeAll")} />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5 xl:gap-5">
          {promo.items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle title={t("bestSellers")} href="/recherche" seeAll={t("seeAll")} />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5 xl:gap-5">
          {bestSellers.items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle title={t("newArrivals")} href="/recherche" seeAll={t("seeAll")} />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5 xl:gap-5">
          {newest.items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3.5 rounded-2xl bg-brand-primary-strong p-5 text-primary-foreground">
        <div>
          <h2 className="font-display text-lg font-extrabold">{t("ctaTitle")}</h2>
          <p className="text-xs text-primary-foreground/85">{t("ctaText")}</p>
        </div>
        <Button asChild variant="cta">
          <Link href="/recherche">
            {t("ctaButton")} <ArrowRight className="size-4 rtl:rotate-180" />
          </Link>
        </Button>
      </section>

      {brands.length > 0 && (
        <section>
          <SectionTitle title={t("ourBrands")} seeAll={t("seeAll")} />
          <div className="grid grid-cols-4 gap-2.5">
            {brands.slice(0, 8).map((b) => (
              <Link
                key={b.id}
                href={`/recherche?brand=${b.slug}`}
                className="flex items-center justify-center rounded-xl border border-border bg-card p-4 font-display font-extrabold text-muted-foreground text-sm hover:border-primary hover:text-primary transition-colors"
              >
                {b.name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
