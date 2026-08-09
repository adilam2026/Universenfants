"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-24">
      <div className="max-w-md text-center">
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
          <Link href="/" className="inline-flex items-center justify-center rounded-full border px-6 py-3 text-sm font-bold">
            Accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
