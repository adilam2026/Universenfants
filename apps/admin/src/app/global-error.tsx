"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

// Filet de sécurité pour une erreur qui échapperait même au layout racine
// (ex : erreur dans layout.tsx lui-même) — error.tsx seul ne la capture pas.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full font-sans flex items-center justify-center">
        <div className="max-w-md px-4 py-24 text-center">
          <p className="text-6xl mb-4">⚠️</p>
          <h1 className="text-2xl font-extrabold mb-2">Une erreur est survenue</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Quelque chose s&apos;est mal passé. Vous pouvez réessayer ou revenir à l&apos;accueil.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={reset}
              className="inline-flex items-center justify-center rounded-full bg-brand-cta text-brand-cta-foreground px-6 py-3 text-sm font-bold"
            >
              Réessayer
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- global-error remplace le layout
                racine : le contexte du Router App peut être indisponible, un <a> classique reste fiable. */}
            <a href="/" className="inline-flex items-center justify-center rounded-full border px-6 py-3 text-sm font-bold">
              Accueil
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
