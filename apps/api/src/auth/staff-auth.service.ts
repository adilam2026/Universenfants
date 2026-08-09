import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import type Redis from "ioredis";
import { PrismaService } from "../prisma/prisma.service";
import { REDIS_CLIENT } from "../redis/redis.module";
import { verifyPassword } from "./password.util";
import type { StaffLoginDto } from "./dto/staff-login.dto";
import type { JwtPayload } from "./types";

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 15 * 60; // §186, paramétrable plus tard via SystemSetting

@Injectable()
export class StaffAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async login(dto: StaffLoginDto, req: Request) {
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const lockKey = `staff:lockout:${dto.email}`;
    const failKey = `staff:failed:${dto.email}`;

    if (await this.redis.get(lockKey)) {
      throw new UnauthorizedException("Compte temporairement bloqué suite à trop de tentatives");
    }

    const staff = await this.prisma.staffUser.findUnique({
      where: { email: dto.email },
      include: { role: true },
    });

    const valid = staff?.active && (await verifyPassword(staff.passwordHash, dto.password));
    if (!valid) {
      const attempts = await this.redis.incr(failKey);
      await this.redis.expire(failKey, LOCKOUT_SECONDS);
      if (attempts >= MAX_ATTEMPTS) {
        await this.redis.set(lockKey, "1", "EX", LOCKOUT_SECONDS);
      }
      await this.prisma.auditLog.create({
        data: { action: "staff.login.failed", entity: "StaffUser", entityId: dto.email, ipAddress: ip },
      });
      throw new UnauthorizedException("Identifiants invalides");
    }

    await this.redis.del(failKey);
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

  /** Émet un nouveau couple de tokens à partir d'un refresh token valide —
   * sans ça, les sessions expirent brutalement après JWT_ACCESS_EXPIRES_IN
   * (15 min par défaut) puisque l'access token n'est jamais renouvelé. */
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

    const staff = await this.prisma.staffUser.findUnique({ where: { id: payload.sub }, include: { role: true } });
    if (!staff?.active) throw new UnauthorizedException("Compte introuvable ou désactivé");

    return this.issueTokens(staff);
  }

  private issueTokens(staff: { id: string; name: string; email: string; role: { code: string } }) {
    const payload: JwtPayload = {
      sub: staff.id,
      kind: "staff",
      email: staff.email,
      roleCode: staff.role.code,
    };
    return {
      accessToken: this.jwt.sign(payload, {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
        algorithm: "HS256",
      }),
      refreshToken: this.jwt.sign(payload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "30d",
        algorithm: "HS256",
      }),
      user: { id: staff.id, name: staff.name, email: staff.email, role: staff.role.code },
    };
  }
}
