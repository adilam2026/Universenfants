import * as Sentry from "@sentry/node";

// Doit être importé avant tout le reste (voir main.ts) pour que Sentry
// puisse instrumenter les modules chargés ensuite. No-op si SENTRY_DSN
// n'est pas défini (dev local) — même logique de dégradation gracieuse
// que Meilisearch/R2/SMTP.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
  });
}
