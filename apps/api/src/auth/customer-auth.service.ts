import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { randomBytes } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";
import { hashPassword, verifyPassword, detectIdentifierKind } from "./password.util";
import { hashRefreshToken } from "./refresh-token.util";
import type { RegisterCustomerDto } from "./dto/register-customer.dto";
import type { LoginDto } from "./dto/login.dto";
import type { ForgotPasswordDto } from "./dto/forgot-password.dto";
import type { ResetPasswordDto } from "./dto/reset-password.dto";
import type { JwtPayload } from "./types";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class CustomerAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly email: EmailService,
  ) {}

  async register(dto: RegisterCustomerDto) {
    if (!dto.email && !dto.phone) {
      throw new ConflictException("Email ou téléphone requis");
    }
    const existing = await this.prisma.customer.findFirst({
      where: {
        OR: [dto.email ? { email: dto.email } : undefined, dto.phone ? { phone: dto.phone } : undefined].filter(
          (x): x is NonNullable<typeof x> => Boolean(x),
        ),
      },
    });

    // Rattachement automatique si un compte invité existe déjà avec cet
    // email/téléphone (§65, §240) plutôt que de créer un doublon.
    if (existing && existing.passwordHash) {
      throw new ConflictException("Un compte existe déjà avec cet email ou ce numéro");
    }

    const passwordHash = await hashPassword(dto.password);
    const customer = existing
      ? await this.prisma.customer.update({
          where: { id: existing.id },
          data: { passwordHash, firstName: dto.firstName, lastName: dto.lastName },
        })
      : await this.prisma.customer.create({
          data: {
            email: dto.email,
            phone: dto.phone,
            firstName: dto.firstName,
            lastName: dto.lastName,
            passwordHash,
          },
        });

    await this.prisma.loyaltyAccount.upsert({
      where: { customerId: customer.id },
      update: {},
      create: { customerId: customer.id },
    });
    await this.prisma.wishlist.upsert({
      where: { customerId: customer.id },
      update: {},
      create: { customerId: customer.id },
    });

    if (customer.email) void this.email.sendAccountCreated(customer.email, customer.firstName);

    return this.issueTokens(customer.id, customer.email);
  }

  async login(dto: LoginDto) {
    const kind = detectIdentifierKind(dto.identifier);
    const customer = await this.prisma.customer.findFirst({
      where: kind === "email" ? { email: dto.identifier } : { phone: dto.identifier },
    });
    if (!customer?.passwordHash || !(await verifyPassword(customer.passwordHash, dto.password))) {
      throw new UnauthorizedException("Identifiants invalides");
    }
    return this.issueTokens(customer.id, customer.email);
  }

  /** Émet un nouveau couple de tokens à partir d'un refresh token valide —
   * sans ça, les sessions expirent brutalement après JWT_ACCESS_EXPIRES_IN
   * (15 min par défaut) puisque l'access token n'est jamais renouvelé.
   *
   * Le token est à usage unique (révoqué en base dès qu'il est consommé) :
   * s'il est présenté une seconde fois, c'est qu'il a été volé et rejoué (ou
   * qu'un refresh concurrent a déjà tourné) — on révoque alors toutes les
   * sessions actives de ce compte plutôt que de faire confiance à un JWT
   * dont la seule validité cryptographique ne suffit plus. */
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
    if (payload.kind !== "customer") throw new UnauthorizedException("Token invalide");

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
        where: { subjectId: payload.sub, kind: "customer", revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException("Session invalide — toutes vos sessions ont été déconnectées par sécurité");
    }

    const customer = await this.prisma.customer.findUnique({ where: { id: payload.sub } });
    if (!customer) throw new UnauthorizedException("Compte introuvable");

    return this.issueTokens(customer.id, customer.email);
  }

  /** Révocation explicite à la déconnexion — sans ça, un refresh token
   * intercepté reste utilisable jusqu'à sa propre expiration (30j) même
   * après que l'utilisateur se soit "déconnecté" côté client. */
  async logout(refreshToken: string) {
    await this.prisma.refreshToken
      .update({ where: { tokenHash: hashRefreshToken(refreshToken) }, data: { revokedAt: new Date() } })
      .catch(() => undefined);
    return { ok: true };
  }

  async me(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: { loyaltyAccount: true },
    });
    if (!customer) throw new NotFoundException("Client introuvable");
    return {
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      ordersCount: customer.ordersCount,
      totalSpent: customer.totalSpent,
      loyaltyPoints: customer.loyaltyAccount?.pointsBalance ?? 0,
    };
  }

  /** Réponse volontairement identique que l'email existe ou non, pour ne pas
   * révéler quels emails sont enregistrés (énumération de comptes). */
  async forgotPassword(dto: ForgotPasswordDto) {
    const customer = await this.prisma.customer.findFirst({ where: { email: dto.email, passwordHash: { not: null } } });
    if (customer?.email) {
      const token = randomBytes(32).toString("hex");
      await this.prisma.customer.update({
        where: { id: customer.id },
        data: { passwordResetToken: token, passwordResetExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
      });
      const resetUrl = `${process.env.WEB_PUBLIC_URL ?? "http://localhost:3000"}/fr/mot-de-passe/reinitialiser?token=${token}`;
      void this.email.sendPasswordReset(customer.email, resetUrl);
    }
    return { ok: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const customer = await this.prisma.customer.findFirst({ where: { passwordResetToken: dto.token } });
    if (!customer || !customer.passwordResetExpiresAt || customer.passwordResetExpiresAt < new Date()) {
      throw new UnauthorizedException("Lien de réinitialisation invalide ou expiré");
    }
    const passwordHash = await hashPassword(dto.password);
    await this.prisma.customer.update({
      where: { id: customer.id },
      data: { passwordHash, passwordResetToken: null, passwordResetExpiresAt: null },
    });
    return { ok: true };
  }

  private async issueTokens(customerId: string, email?: string | null) {
    const payload: JwtPayload = { sub: customerId, kind: "customer", email, jti: randomBytes(16).toString("hex") };
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
        kind: "customer",
        subjectId: customerId,
        expiresAt: new Date(decoded.exp * 1000),
      },
    });

    return { accessToken, refreshToken };
  }
}
