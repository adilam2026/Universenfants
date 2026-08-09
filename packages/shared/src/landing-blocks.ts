// Types de blocs pour le générateur de Landing Pages (module Marketing).
// Une LandingPage stocke un tableau ordonné de blocs (`LandingPage.blocks`,
// JSON) — ce fichier est la source de vérité du contrat partagé entre
// apps/api (validation), apps/admin (éditeur) et apps/web (rendu public).
//
// Le produit (galerie + prix/promo + titre) occupe toujours le haut de page,
// quel que soit l'ordre des blocs : "hero" et "gallery" alimentent cette
// vitrine fixe plutôt que d'être rendus comme des sections parmi d'autres
// (voir apps/web/src/app/lp/[slug]/page.tsx). Les autres blocs (description,
// advantages, trust, testimonials, faq) restent librement réordonnables.

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
  items: { name: string; rating: number; comment: string; photoUrl?: string }[];
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
  "toy-premium",
  "flash-promo",
  "viral",
  "single-product",
  "seasonal",
  "storytelling",
  "facebook-ads",
  "tiktok-ads",
] as const;
export type LandingTemplate = (typeof LANDING_TEMPLATES)[number];

export const LANDING_THEMES = ["universenfants", "premium", "promo-flash", "minimalist"] as const;
export type LandingTheme = (typeof LANDING_THEMES)[number];

export const LANDING_THEME_STYLES: Record<
  LandingTheme,
  { primary: string; secondary: string; cta: string; soft: string; fontDisplay: string; radius: string }
> = {
  universenfants: {
    primary: "#6c5ce7",
    secondary: "#a78bfa",
    cta: "#ff6b81",
    soft: "#f3f1fb",
    fontDisplay: "ui-rounded, 'Segoe UI Rounded', sans-serif",
    radius: "1.5rem",
  },
  premium: {
    primary: "#8a6d1f",
    secondary: "#1a1a2e",
    cta: "#c9a227",
    soft: "#f7f4ec",
    fontDisplay: "Georgia, 'Times New Roman', serif",
    radius: "0.75rem",
  },
  "promo-flash": {
    primary: "#dc2626",
    secondary: "#f97316",
    cta: "#facc15",
    soft: "#fff1f0",
    fontDisplay: "system-ui, sans-serif",
    radius: "0.75rem",
  },
  minimalist: {
    primary: "#18181b",
    secondary: "#71717a",
    cta: "#18181b",
    soft: "#fafafa",
    fontDisplay: "system-ui, sans-serif",
    radius: "0.25rem",
  },
};

/** Thème conseillé à la sélection du template (l'utilisateur peut toujours
 * en choisir un autre ensuite). */
export function defaultThemeForTemplate(template: LandingTemplate): LandingTheme {
  switch (template) {
    case "flash-promo":
    case "tiktok-ads":
      return "promo-flash";
    case "toy-premium":
    case "storytelling":
      return "premium";
    case "viral":
    case "facebook-ads":
      return "universenfants";
    default:
      return "universenfants";
  }
}

/** Pré-remplissage par défaut selon le template choisi — l'utilisateur peut
 * ensuite tout modifier. "hero" et "gallery" alimentent la vitrine produit
 * fixe (voir en-tête de fichier) ; les autres blocs sont le corps de page. */
export function defaultBlocksForTemplate(template: LandingTemplate): LandingPageBlock[] {
  const hero: HeroBlock = { type: "hero", title: "", subtitle: "" };
  const gallery: GalleryBlock = { type: "gallery", images: [] };
  const description: DescriptionBlock = { type: "description", text: "" };
  const testimonials: TestimonialsBlock = { type: "testimonials", items: [] };
  const faq: FaqBlock = { type: "faq", items: [] };
  const trust: TrustBlock = {
    type: "trust",
    items: ["Paiement à la livraison", "Livraison partout au Maroc", "Service client réactif", "Produit vérifié"],
  };

  switch (template) {
    case "toy-premium": {
      const advantages: AdvantagesBlock = {
        type: "advantages",
        items: ["Éveil et apprentissage", "Matériaux sûrs et testés", "Le cadeau qui fait plaisir", "Livraison rapide partout au Maroc"],
      };
      return [hero, description, advantages, trust, testimonials, faq, gallery];
    }
    case "flash-promo":
    case "tiktok-ads": {
      const advantages: AdvantagesBlock = { type: "advantages", items: ["Stock limité", "Livraison rapide", "Paiement à la livraison"] };
      return [hero, advantages, trust, testimonials, faq, gallery];
    }
    case "viral":
    case "facebook-ads": {
      const advantages: AdvantagesBlock = { type: "advantages", items: ["Léger", "Solide", "Facile à utiliser", "Livraison rapide"] };
      return [hero, advantages, testimonials, trust, faq, gallery];
    }
    case "storytelling": {
      const advantages: AdvantagesBlock = { type: "advantages", items: [] };
      return [hero, description, gallery, advantages, testimonials, faq, trust];
    }
    default: {
      const advantages: AdvantagesBlock = { type: "advantages", items: [] };
      return [hero, gallery, description, advantages, trust, testimonials, faq];
    }
  }
}
