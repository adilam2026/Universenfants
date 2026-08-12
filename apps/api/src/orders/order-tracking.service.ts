import { Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { randomInt } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { WhatsAppService } from "../whatsapp/whatsapp.service";
import { hashPassword, verifyPassword } from "../auth/password.util";
import { maskPhone } from "../common/phone.util";
import { sanitizeOrderForCustomer } from "./order-sanitize.util";
import { GUEST_TRACKING_SECRET } from "./guest-tracking-secret";

const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const HOURLY_REQUEST_CAP = 5;
const MAX_VERIFY_ATTEMPTS = 5;
const GUEST_TOKEN_TTL = "30m";

/** Suivi de commande sans compte : numéro de commande + OTP WhatsApp envoyé
 * au téléphone déjà associé à LA commande (Order.shippingPhone) — jamais un
 * numéro saisi par l'utilisateur à ce stade, jamais le numéro de commande
 * seul considéré comme preuve d'identité (voir GuestOrderTrackingGuard pour
 * la suite : le token émis après vérification est scopé à un seul orderId,
 * jamais à un client entier). */
@Injectable()
export class OrderTrackingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
    private readonly jwt: JwtService,
  ) {}

  // Réponse identique en forme que la commande existe ou non (maskedPhone
  // null si introuvable) — limite l'énumération, mais ne l'élimine pas
  // complètement : les numéros de commande restent séquentiels
  // (UE-2026-000001…), donc un débit de requêtes fort (@Throttle côté
  // contrôleur) reste la vraie protection contre un balayage en masse.
  async requestOtp(orderNumber: string): Promise<{ ok: true; maskedPhone: string | null }> {
    const order = await this.prisma.order.findUnique({ where: { orderNumber } });
    if (!order) return { ok: true, maskedPhone: null };

    const masked = maskPhone(order.shippingPhone);
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const [recent, hourlyCount] = await Promise.all([
      this.prisma.orderTrackingOtp.findFirst({
        where: { orderId: order.id, createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_MS) } },
      }),
      this.prisma.orderTrackingOtp.count({ where: { orderId: order.id, createdAt: { gt: since } } }),
    ]);
    // Repli silencieux (pas d'erreur) : le client ne doit pas pouvoir
    // distinguer "code déjà envoyé récemment" de "commande introuvable" —
    // même logique d'anti-énumération que ci-dessus.
    if (recent || hourlyCount >= HOURLY_REQUEST_CAP) return { ok: true, maskedPhone: masked };

    const code = randomInt(100000, 1000000).toString();
    const codeHash = await hashPassword(code);
    await this.prisma.orderTrackingOtp.create({
      data: { orderId: order.id, codeHash, phone: order.shippingPhone, expiresAt: new Date(Date.now() + OTP_TTL_MS) },
    });
    void this.whatsapp.sendOtp(order.shippingPhone, code);
    return { ok: true, maskedPhone: masked };
  }

  async verifyOtp(orderNumber: string, code: string): Promise<{ token: string }> {
    const invalidCode = () => new UnauthorizedException("Code invalide ou expiré");

    const order = await this.prisma.order.findUnique({ where: { orderNumber } });
    if (!order) throw invalidCode();

    const otp = await this.prisma.orderTrackingOtp.findFirst({
      where: { orderId: order.id, used: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!otp) throw invalidCode();

    if (otp.attempts >= MAX_VERIFY_ATTEMPTS) {
      await this.prisma.orderTrackingOtp.update({ where: { id: otp.id }, data: { used: true } });
      throw new UnauthorizedException("Trop de tentatives — demandez un nouveau code");
    }

    const match = await verifyPassword(otp.codeHash, code);
    if (!match) {
      await this.prisma.orderTrackingOtp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
      throw invalidCode();
    }

    await this.prisma.orderTrackingOtp.update({ where: { id: otp.id }, data: { used: true } });
    const token = await this.jwt.signAsync(
      { kind: "guest-order-tracking", orderId: order.id },
      { secret: GUEST_TRACKING_SECRET, expiresIn: GUEST_TOKEN_TTL, algorithm: "HS256" },
    );
    return { token };
  }

  async findByGuestToken(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { lines: true, statusHistory: { orderBy: { createdAt: "asc" } } },
    });
    if (!order) throw new NotFoundException("Commande introuvable");
    return sanitizeOrderForCustomer(order);
  }
}
