import Link from "next/link";
import "./globals.css";

// Filet de sécurité pour une route qui échapperait au segment [locale] (cas
// limite — en usage normal, proxy.ts redirige toute URL vers /fr ou /ar,
// qui a son propre not-found.tsx localisé).
export default function RootNotFound() {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full font-sans flex items-center justify-center">
        <div className="max-w-md px-4 py-24 text-center">
          <p className="text-6xl mb-4">🧸</p>
          <h1 className="text-2xl font-extrabold mb-2">Page introuvable</h1>
          <p className="text-sm text-muted-foreground mb-6">Cette page n&apos;existe pas ou a été déplacée.</p>
          <Link
            href="/fr"
            className="inline-flex items-center justify-center rounded-full bg-brand-cta text-brand-cta-foreground px-6 py-3 text-sm font-bold"
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      </body>
    </html>
  );
}
