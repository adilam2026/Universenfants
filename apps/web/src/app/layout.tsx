import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

// Polices système (pas de next/font/google : aucune dépendance réseau au
// build, cohérent avec la direction artistique validée en Phase 1).
const fontVars = "[--font-family-display:ui-rounded,'SF_Pro_Rounded','Segoe_UI_Rounded',Nunito,system-ui,sans-serif] [--font-family-sans:-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,system-ui,sans-serif]";

export const metadata: Metadata = {
  title: {
    default: "UniversEnfants — Jouets, cadeaux & univers enfants",
    template: "%s · UniversEnfants",
  },
  description:
    "Jouets, cadeaux et fournitures pour enfants au Maroc. Conseiller Cadeau, liste anniversaire, livraison partout au Maroc, paiement à la livraison.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`h-full antialiased ${fontVars}`}>
      <body className="min-h-full flex flex-col font-sans">
        <SiteHeader />
        <main className="flex-1 pb-20 md:pb-0">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
