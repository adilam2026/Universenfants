import * as Sentry from "@sentry/nextjs";

// No-op si NEXT_PUBLIC_SENTRY_DSN n'est pas défini (dev local) — même
// logique de dégradation gracieuse que Meilisearch/R2/SMTP côté API.
// Volontairement sans withSentryConfig (next.config.ts inchangé) : cette
// intégration se limite à la capture d'erreurs, sans upload de source maps
// (qui nécessiterait SENTRY_AUTH_TOKEN/ORG/PROJECT en configuration CI).
export function register() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
  });
}

export const onRequestError = Sentry.captureRequestError;
