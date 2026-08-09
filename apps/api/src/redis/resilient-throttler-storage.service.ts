import { Logger } from "@nestjs/common";
import { ThrottlerStorageRedisService } from "@nest-lab/throttler-storage-redis";

// Redéfini localement plutôt qu'importé depuis un chemin interne
// (@nestjs/throttler ne réexporte pas ce type depuis son point d'entrée
// public) — forme stable, 4 champs, peu de risque de dérive.
interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

/** ThrottlerStorageRedisService.increment() ne capture aucune erreur Redis —
 * comme ThrottlerGuard est enregistré en APP_GUARD global (app.module.ts),
 * une panne Redis ferait échouer CETTE requête ET, sans ce correctif,
 * TOUTES les requêtes suivantes à l'API (chacune protégée par le même
 * garde), transformant une panne du sous-système de rate limiting en panne
 * totale de la plateforme. Le rate limiting est une mesure de protection,
 * pas une fonctionnalité critique : mieux vaut le désactiver temporairement
 * (fail-open) que de faire tomber toute l'API avec lui. */
export class ResilientThrottlerStorageService extends ThrottlerStorageRedisService {
  private readonly logger = new Logger("ThrottlerStorage");

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    try {
      return await super.increment(key, ttl, limit, blockDuration, throttlerName);
    } catch (err) {
      this.logger.error(`Redis indisponible pour le rate limiting, requête autorisée par défaut : ${(err as Error).message}`);
      return { totalHits: 1, timeToExpire: 0, isBlocked: false, timeToBlockExpire: 0 };
    }
  }
}
