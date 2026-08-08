import { Logger } from "@nestjs/common";

const REQUIRED_IN_PRODUCTION = ["DATABASE_URL", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET", "CORS_ORIGINS"];

const PLACEHOLDER_VALUES = new Set([
  "change-me-access",
  "change-me-refresh",
  "dev-access-secret-change-in-prod-1234567890",
  "dev-refresh-secret-change-in-prod-0987654321",
]);

/** Échoue au démarrage plutôt qu'en production avec des secrets par défaut
 * ou une configuration incomplète — préférable à une erreur 500 découverte
 * en prod par un client. */
export function assertRequiredEnv() {
  if (process.env.NODE_ENV !== "production") return;

  const missing = REQUIRED_IN_PRODUCTION.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Variables d'environnement manquantes en production : ${missing.join(", ")}`);
  }

  const usingPlaceholder = ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"].filter((key) =>
    PLACEHOLDER_VALUES.has(process.env[key] ?? ""),
  );
  if (usingPlaceholder.length > 0) {
    throw new Error(`Secrets de développement détectés en production : ${usingPlaceholder.join(", ")}`);
  }

  if (!process.env.SENTRY_DSN) {
    Logger.warn("SENTRY_DSN non défini — les erreurs ne seront pas remontées à Sentry en production", "Bootstrap");
  }
  if (!process.env.SMTP_HOST) {
    Logger.warn("SMTP_HOST non défini — les emails transactionnels ne seront pas envoyés en production", "Bootstrap");
  }
}
