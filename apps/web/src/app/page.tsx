import Link from "next/link";
import { Truck, Wallet, RotateCcw, Star, Gift, Cake, ArrowRight } from "lucide-react";
import { getCategoryTree, getProducts } from "@/lib/api";
import { ProductCard } from "@/components/product-card";
import { HeroCarousel } from "@/components/hero-carousel";
import { Button } from "@/components/ui/button";

const AGE_TILES = [
  { label: "0-2 ans", emoji: "🍼", min: 0, max: 2 },
  { label: "3-5 ans", emoji: "🧸", min: 3, max: 5 },
  { label: "6-8 ans", emoji: "🧩", min: 6, max: 8 },
  { label: "9-12 ans", emoji: "🚲", min: 9, max: 12 },
  { label: "12 ans et +", emoji: "🎮", min: 12 },
];

const CATEGORY_STYLE: Record<string, { gradient: string; motif: string }> = {
  construction: { gradient: "linear-gradient(150deg, #8172d6, #5b4cae)", motif: "🧱" },
  poupees: { gradient: "linear-gradient(150deg, #ff8fa3, #e56e85)", motif: "🎀" },
  educatifs: { gradient: "linear-gradient(150deg, #4fae72, #3a8c58)", motif: "🧩" },
  societe: { gradient: "linear-gradient(150deg, #d98a3d, #b5702a)", motif: "🎲" },
  "plein-air": { gradient: "linear-gradient(150deg, #4f9dae, #37788a)", motif: "⚽" },
  bebe: { gradient: "linear-gradient(150deg, #e2707d, #c85562)", motif: "🍼" },
  scolaire: { gradient: "linear-gradient(150deg, #9b7dd6, #7a5cc4)", motif: "🎒" },
};

function SectionTitle({ title, href }: { title: string; href?: string }) {
  return (
    <div className="flex items-center justify-between mb-3.5">
      <h2 className="font-display text-xl font-extrabold">{title}</h2>
      {href && (
        <Button asChild variant="outline" size="sm">
          <Link href={href}>Tout voir</Link>
        </Button>
      )}
    </div>
  );
}

export default async function HomePage() {
  const [categories, trending, promo, bestSellers, newest] = await Promise.all([
    getCategoryTree(),
    getProducts({ sort: "newest", limit: 4 }),
    getProducts({ promoOnly: true, limit: 4 }),
    getProducts({ sort: "bestsellers", limit: 4 }),
    getProducts({ sort: "newest", limit: 4, page: 1 }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-7 py-3 flex flex-col gap-7">
      <HeroCarousel />

      <section className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { icon: Truck, label: "Livraison partout au Maroc" },
          { icon: Wallet, label: "Paiement à la livraison" },
          { icon: RotateCcw, label: "Retour simple" },
          { icon: Star, label: "Produits sélectionnés" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-xs font-bold text-muted-foreground">
            <item.icon className="size-4 shrink-0 text-primary" />
            {item.label}
          </div>
        ))}
      </section>

      <section>
        <SectionTitle title="Rechercher par âge" />
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
          {AGE_TILES.map((tile) => (
            <Link
              key={tile.label}
              href={`/recherche?ageMin=${tile.min}${tile.max ? `&ageMax=${tile.max}` : ""}`}
              className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 text-center text-xs font-extrabold hover:border-primary"
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-xl">{tile.emoji}</span>
              {tile.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Link href="/conseiller-cadeau" className="flex flex-col justify-end gap-1 rounded-2xl bg-primary p-4 text-primary-foreground min-h-24">
          <Gift className="size-6" />
          <strong className="text-sm">Trouver un cadeau</strong>
          <span className="text-xs opacity-85">Idéal en 30 secondes</span>
        </Link>
        <Link href="/liste-anniversaire" className="flex flex-col justify-end gap-1 rounded-2xl bg-brand-cta p-4 text-brand-cta-foreground min-h-24">
          <Cake className="size-6" />
          <strong className="text-sm">Liste anniversaire</strong>
          <span className="text-xs opacity-85">Créer &amp; partager</span>
        </Link>
      </section>

      <section>
        <SectionTitle title="Tendances du moment" href="/recherche" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
          {trending.items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section className="flex items-center gap-3.5 rounded-2xl bg-brand-primary-soft p-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Gift className="size-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-sm">Besoin d&apos;une idée cadeau ?</h3>
          <p className="hidden sm:block text-xs text-muted-foreground mt-0.5">
            Répondez à 4 questions et trouvez le cadeau idéal en moins de 30 secondes.
          </p>
        </div>
        <Button asChild variant="default" size="sm">
          <Link href="/conseiller-cadeau">Commencer</Link>
        </Button>
      </section>

      <section className="flex items-center gap-3.5 rounded-2xl bg-brand-cta-soft p-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-cta text-brand-cta-foreground">
          <Cake className="size-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-sm">Liste anniversaire</h3>
          <p className="hidden sm:block text-xs text-muted-foreground mt-0.5">
            Créez une liste, partagez-la, évitez les doublons grâce à la réservation.
          </p>
        </div>
        <Button asChild variant="cta" size="sm">
          <Link href="/liste-anniversaire">Créer</Link>
        </Button>
      </section>

      <section>
        <SectionTitle title="🔥 Promotions" href="/categorie/construction" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
          {promo.items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle title="Meilleures ventes" href="/recherche" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
          {bestSellers.items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle title="Nouveautés" href="/recherche" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
          {newest.items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3.5 rounded-2xl bg-brand-primary-strong p-5 text-primary-foreground">
        <div>
          <h2 className="font-display text-lg font-extrabold">Envie de voir plus ?</h2>
          <p className="text-xs text-primary-foreground/85">Plus de 1 500 jouets, du 0 au 12 ans et +.</p>
        </div>
        <Button asChild variant="cta">
          <Link href="/recherche">
            Explorer tous les jouets <ArrowRight className="size-4" />
          </Link>
        </Button>
      </section>

      <section>
        <SectionTitle title="Explorer par univers" />
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
                <span className="absolute -bottom-2.5 -right-1.5 rotate-[-8deg] text-5xl opacity-20">{style.motif}</span>
                <span className="relative z-10 text-lg">{cat.image ?? style.motif}</span>
                <span className="relative z-10 text-xs font-extrabold text-balance">{cat.nameFr}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <SectionTitle title="Nos marques" />
        <div className="grid grid-cols-4 gap-2.5">
          {["LEGO", "Barbie", "Fisher-Price", "Hot Wheels", "VTech", "Playmobil", "Chicco", "Clairefontaine"].map((b) => (
            <div key={b} className="flex items-center justify-center rounded-xl border border-border bg-card p-4 font-display font-extrabold text-muted-foreground text-sm">
              {b}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
