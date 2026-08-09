import * as Sentry from "@sentry/nextjs";

// No-op si NEXT_PUBLIC_SENTRY_DSN n'est pas défini (dev local) — même
// logique de dégradation gracieuse que côté serveur (instrumentation.ts) et
// que Meilisearch/R2/SMTP dans l'API.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
