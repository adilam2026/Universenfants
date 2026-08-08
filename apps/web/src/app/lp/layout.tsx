import type { Metadata } from "next";
import "../globals.css";

// Layout racine dédié : les Landing Pages n'ont pas le header/footer/nav du
// site principal (§17 "ne pas reproduire le site e-commerce principal") —
// juste le strict nécessaire pour une page de vente rapide et autonome.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function LandingPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
