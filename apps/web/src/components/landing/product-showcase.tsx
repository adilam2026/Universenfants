import { LandingGallery } from "./landing-gallery";
import { PriceBadge } from "./price-badge";
import { CountdownTimer } from "./countdown-timer";

export function ProductShowcase({
  images,
  videoUrl,
  title,
  subtitle,
  price,
  compareAt,
  ctaLabel,
  countdownEndAt,
}: {
  images: string[];
  videoUrl?: string;
  title: string;
  subtitle?: string;
  price: number;
  compareAt: number | null;
  ctaLabel: string;
  countdownEndAt: string | null;
}) {
  return (
    <section className="bg-white">
      {countdownEndAt && <CountdownTimer endAt={countdownEndAt} />}
      <LandingGallery images={images} videoUrl={videoUrl} alt={title} />
      <div className="px-5 py-5 text-center max-w-md mx-auto">
        <h1 className="text-2xl font-extrabold text-balance" style={{ color: "var(--lp-secondary, #2a2438)" }}>
          {title}
        </h1>
        {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
        <PriceBadge price={price} compareAt={compareAt} />
        <a
          href="#commande"
          className="mt-2 block w-full rounded-full py-3.5 text-center text-white font-extrabold text-base shadow-lg"
          style={{ background: "var(--lp-cta)" }}
        >
          {ctaLabel}
        </a>
        <p className="mt-2 text-xs text-muted-foreground">Paiement à la livraison — aucun compte requis.</p>
      </div>
    </section>
  );
}
