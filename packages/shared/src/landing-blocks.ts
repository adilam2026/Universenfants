// Types de blocs pour le générateur de Landing Pages (module Marketing).
// Une LandingPage stocke un tableau ordonné de blocs (`LandingPage.blocks`,
// JSON) — ce fichier est la source de vérité du contrat partagé entre
// apps/api (validation), apps/admin (éditeur) et apps/web (rendu public).

export interface HeroBlock {
  type: "hero";
  bannerUrl?: string;
  videoUrl?: string;
  title: string;
  subtitle?: string;
}

export interface GalleryBlock {
  type: "gallery";
  images: string[];
  videos?: string[];
}

export interface DescriptionBlock {
  type: "description";
  text: string;
}

export interface AdvantagesBlock {
  type: "advantages";
  items: string[];
}

export interface TestimonialsBlock {
  type: "testimonials";
  items: { name: string; rating: number; comment: string }[];
}

export interface FaqBlock {
  type: "faq";
  items: { question: string; answer: string }[];
}

export interface TrustBlock {
  type: "trust";
  items: string[];
}

export type LandingPageBlock =
  | HeroBlock
  | GalleryBlock
  | DescriptionBlock
  | AdvantagesBlock
  | TestimonialsBlock
  | FaqBlock
  | TrustBlock;

export const LANDING_BLOCK_TYPES = ["hero", "gallery", "description", "advantages", "testimonials", "faq", "trust"] as const;

export const LANDING_TEMPLATES = [
  "single-product",
  "viral",
  "seasonal",
  "storytelling",
  "facebook-ads",
  "tiktok-ads",
  "flash-promo",
] as const;
export type LandingTemplate = (typeof LANDING_TEMPLATES)[number];

export const LANDING_THEMES = ["universenfants", "premium", "promo-flash", "minimalist"] as const;
export type LandingTheme = (typeof LANDING_THEMES)[number];

export const LANDING_THEME_STYLES: Record<
  LandingTheme,
  { primary: string; secondary: string; cta: string; fontDisplay: string; radius: string }
> = {
  universenfants: { primary: "#6c5ce7", secondary: "#a78bfa", cta: "#ff6b81", fontDisplay: "ui-rounded, sans-serif", radius: "1.5rem" },
  premium: { primary: "#1a1a2e", secondary: "#16213e", cta: "#c9a227", fontDisplay: "Georgia, serif", radius: "0.5rem" },
  "promo-flash": { primary: "#dc2626", secondary: "#f97316", cta: "#facc15", fontDisplay: "system-ui, sans-serif", radius: "0.75rem" },
  minimalist: { primary: "#18181b", secondary: "#71717a", cta: "#18181b", fontDisplay: "system-ui, sans-serif", radius: "0.25rem" },
};

/** Pré-remplissage par défaut selon le template choisi (§5) — l'utilisateur
 * peut ensuite tout modifier (§7). */
export function defaultBlocksForTemplate(template: LandingTemplate): LandingPageBlock[] {
  const hero: HeroBlock = { type: "hero", title: "", subtitle: "" };
  const gallery: GalleryBlock = { type: "gallery", images: [] };
  const description: DescriptionBlock = { type: "description", text: "" };
  const advantages: AdvantagesBlock = { type: "advantages", items: [] };
  const testimonials: TestimonialsBlock = { type: "testimonials", items: [] };
  const faq: FaqBlock = { type: "faq", items: [] };
  const trust: TrustBlock = {
    type: "trust",
    items: ["Paiement à la livraison", "Livraison partout au Maroc", "Service client réactif", "Produit vérifié"],
  };

  switch (template) {
    case "storytelling":
      return [hero, description, gallery, advantages, testimonials, faq, trust];
    case "flash-promo":
    case "facebook-ads":
    case "tiktok-ads":
      return [hero, gallery, advantages, trust, testimonials, faq];
    default:
      return [hero, gallery, description, advantages, trust, testimonials, faq];
  }
}
