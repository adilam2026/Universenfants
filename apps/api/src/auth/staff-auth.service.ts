import { Inject, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { randomBytes } from "node:crypto";
import type { Request } from "express";
import type Redis from "ioredis";
import { PrismaService } from "../prisma/prisma.service";
import { REDIS_CLIENT } from "../redis/redis.module";
import { hashPassword, verifyPassword } from "./password.util";
import { hashRefreshToken } from "./refresh-token.util";
import { resolveStaffPermissions } from "./staff-permissions.util";
import type { StaffLoginDto } from "./dto/staff-login.dto";
import type { ChangeStaffPasswordDto } from "./dto/change-staff-password.dto";
import type { JwtPayload } from "./types";

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 15 * 60; // §186, paramétrable plus tard via SystemSetting

@Injectable()
export class StaffAuthService {
  private readonly logger = new Logger(StaffAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async login(dto: StaffLoginDto, req: Request) {
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const lockKey = `staff:lockout:${dto.email}`;
    const failKey = `staff:failed:${dto.email}`;

    if (await this.isLockedOut(lockKey)) {
      throw new UnauthorizedException("Compte temporairement bloqué suite à trop de tentatives");
    }

    const staff = await this.prisma.staffUser.findUnique({
      where: { email: dto.email },
      include: { role: true },
    });

    const valid = staff?.active && (await verifyPassword(staff.passwordHash, dto.password));
    if (!valid) {
      await this.recordFailedAttempt(failKey, lockKey);
      await this.prisma.auditLog.create({
        data: { action: "staff.login.failed", entity: "StaffUser", entityId: dto.email, ipAddress: ip },
      });
      throw new UnauthorizedException("Identifiants invalides");
    }

    await this.clearFailedAttempts(failKey);
    await this.prisma.staffUser.update({ where: { id: staff.id }, data: { lastLoginAt: new Date() } });
    await this.prisma.auditLog.create({
      data: {
        staffUserId: staff.id,
        action: "staff.login.success",
        entity: "StaffUser",
        entityId: staff.id,
        ipAddress: ip,
      },
    });

    return this.issueTokens(staff);
  }

  /** Le verrouillage anti-bruteforce est une protection en profondeur, pas
   * un mécanisme dont dépend la disponibilité du Back-Office : sans ce
   * repli, une panne Redis (ou son absence en environnement minimal, comme
   * en production sans Redis configuré) rendrait la connexion staff
   * impossible pour tout le monde plutôt que de simplement désactiver ce
   * contrôle — même logique que ResilientThrottlerStorageService. */
  private async isLockedOut(lockKey: string): Promise<boolean> {
    try {
      return Boolean(await this.redis.get(lockKey));
    } catch (err) {
      this.logger.warn(`Redis indisponible pour le verrouillage anti-bruteforce, connexion autorisée : ${(err as Error).message}`);
      return false;
    }
  }

  private async recordFailedAttempt(failKey: string, lockKey: string): Promise<void> {
    try {
      const attempts = await this.redis.incr(failKey);
      await this.redis.expire(failKey, LOCKOUT_SECONDS);
      if (attempts >= MAX_ATTEMPTS) {
        await this.redis.set(lockKey, "1", "EX", LOCKOUT_SECONDS);
      }
    } catch (err) {
      this.logger.warn(`Redis indisponible, comptage des tentatives échouées ignoré : ${(err as Error).message}`);
    }
  }

  private async clearFailedAttempts(failKey: string): Promise<void> {
    try {
      await this.redis.del(failKey);
    } catch (err) {
      this.logger.warn(`Redis indisponible, réinitialisation des tentatives échouées ignorée : ${(err as Error).message}`);
    }
  }

  /** Émet un nouveau couple de tokens à partir d'un refresh token valide —
   * sans ça, les sessions expirent brutalement après JWT_ACCESS_EXPIRES_IN
   * (15 min par défaut) puisque l'access token n'est jamais renouvelé.
   *
   * Le token est à usage unique (révoqué en base dès qu'il est consommé) :
   * s'il est présenté une seconde fois, c'est qu'il a été volé et rejoué (ou
   * qu'un refresh concurrent a déjà tourné) — on révoque alors toutes les
   * sessions actives de ce compte, particulièrement sensible côté staff
   * (accès Back-Office) plutôt que de faire confiance à un JWT dont la seule
   * validité cryptographique ne suffit plus. */
  async refresh(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = this.jwt.verify<JwtPayload>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
        algorithms: ["HS256"],
      });
    } catch {
      throw new UnauthorizedException("Session expirée, merci de vous reconnecter");
    }
    if (payload.kind !== "staff") throw new UnauthorizedException("Token invalide");

    const tokenHash = hashRefreshToken(refreshToken);
    // Verrou de ligne : sans lui, deux refresh() concurrents pour le même
    // refresh token (deux onglets, retry réseau, ou un jeton volé rejoué en
    // parallèle de l'usage légitime) peuvent tous deux lire revokedAt=null
    // avant qu'aucun n'ait committé sa révocation, et donc réussir tous les
    // deux — un jeton pourtant "à usage unique" produirait alors deux
    // sessions valides au lieu de déclencher la détection de rejeu prévue.
    const reused = await this.prisma.$transaction(async (tx) => {
      const [stored] = await tx.$queryRaw<{ id: string; revokedAt: Date | null }[]>`
        SELECT id, "revokedAt" FROM "RefreshToken" WHERE "tokenHash" = ${tokenHash} FOR UPDATE`;
      if (!stored) throw new UnauthorizedException("Session expirée, merci de vous reconnecter");
      if (stored.revokedAt) return true;
      await tx.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
      return false;
    });
    if (reused) {
      await this.prisma.refreshToken.updateMany({
        where: { subjectId: payload.sub, kind: "staff", revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException("Session invalide — toutes vos sessions ont été déconnectées par sécurité");
    }

    const staff = await this.prisma.staffUser.findUnique({ where: { id: payload.sub }, include: { role: true } });
    if (!staff?.active) throw new UnauthorizedException("Compte introuvable ou désactivé");

    return this.issueTokens(staff);
  }

  /** Révocation explicite à la déconnexion — sans ça, un refresh token
   * intercepté reste utilisable jusqu'à sa propre expiration (30j) même
   * après que le membre du staff se soit "déconnecté" côté client. */
  async logout(refreshToken: string) {
    await this.prisma.refreshToken
      .update({ where: { tokenHash: hashRefreshToken(refreshToken) }, data: { revokedAt: new Date() } })
      .catch(() => undefined);
    return { ok: true };
  }

  /** Libre-service : un membre du staff change son propre mot de passe.
   * Révoque les refresh tokens existants — comme lors d'une détection de
   * rejeu, un changement de mot de passe doit invalider les autres sessions
   * actives (ex: un appareil volé), pas seulement clôturer poliment celle
   * en cours. */
  async changePassword(staffId: string, dto: ChangeStaffPasswordDto) {
    const staff = await this.prisma.staffUser.findUniqueOrThrow({ where: { id: staffId } });
    const valid = await verifyPassword(staff.passwordHash, dto.currentPassword);
    if (!valid) throw new UnauthorizedException("Mot de passe actuel incorrect");

    await this.prisma.staffUser.update({
      where: { id: staffId },
      data: { passwordHash: await hashPassword(dto.newPassword) },
    });
    await this.prisma.refreshToken.updateMany({
      where: { subjectId: staffId, kind: "staff", revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  private async issueTokens(staff: { id: string; name: string; email: string; role: { code: string } }) {
    const payload: JwtPayload = {
      sub: staff.id,
      kind: "staff",
      email: staff.email,
      roleCode: staff.role.code,
      jti: randomBytes(16).toString("hex"),
    };
    const accessToken = this.jwt.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
      algorithm: "HS256",
    });
    const refreshToken = this.jwt.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "30d",
      algorithm: "HS256",
    });

    const decoded = this.jwt.decode<{ exp: number }>(refreshToken);
    await this.prisma.refreshToken.create({
      data: {
        tokenHash: hashRefreshToken(refreshToken),
        kind: "staff",
        subjectId: staff.id,
        expiresAt: new Date(decoded.exp * 1000),
      },
    });

    // Le Front n'avait aucun moyen de savoir ce qu'un membre du staff peut
    // réellement faire : la sidebar affichait tous les modules à tout le
    // monde, et seule la soumission finale révélait un 403. On expose donc
    // l'ensemble de permissions déjà calculé côté serveur (PermissionsGuard)
    // pour que l'UI puisse masquer/désactiver en conséquence — la vérification
    // serveur reste la seule source de vérité, ceci n'est qu'un reflet pour l'affichage.
    const resolved = await resolveStaffPermissions(this.prisma, staff.id);

    return {
      accessToken,
      refreshToken,
      user: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: staff.role.code,
        permissions: resolved?.permissions ?? [],
      },
    };
  }
}
