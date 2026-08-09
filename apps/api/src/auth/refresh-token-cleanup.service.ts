import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";

/** Purge les lignes RefreshToken devenues inutiles (révoquées ou expirées) —
 * sans ça, cette table grossit indéfiniment puisqu'un refresh token en crée
 * une nouvelle à chaque rotation et qu'aucune ligne n'est jamais supprimée. */
@Injectable()
export class RefreshTokenCleanupService {
  private readonly logger = new Logger(RefreshTokenCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanup() {
    // Uniquement les lignes expirées, pas juste révoquées : une ligne révoquée
    // reste utile jusqu'à sa propre expiration pour la détection de rejeu
    // (cf. refresh() dans customer-auth.service.ts / staff-auth.service.ts) —
    // au-delà, le JWT lui-même échouerait de toute façon à la vérification
    // de signature/exp, donc la conserver plus longtemps n'apporte rien.
    const { count } = await this.prisma.refreshToken.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    if (count > 0) this.logger.log(`Purged ${count} expired refresh tokens`);
  }
}
