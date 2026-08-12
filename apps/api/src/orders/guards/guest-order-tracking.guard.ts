import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { GUEST_TRACKING_SECRET } from "../guest-tracking-secret";

interface GuestOrderTrackingPayload {
  kind: "guest-order-tracking";
  orderId: string;
}

// Volontairement indépendant de JwtStrategy/JwtAuthGuard (secret différent,
// jamais enregistré dans Passport) : un token de suivi invité ne doit
// jamais pouvoir, même par erreur de câblage ailleurs, être accepté par une
// route protégée par JwtAuthGuard — les deux systèmes ne partagent aucun
// secret ni aucune stratégie commune.
@Injectable()
export class GuestOrderTrackingGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { guestOrderId?: string }>();
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) throw new UnauthorizedException("Session de suivi manquante ou expirée");

    try {
      const payload = await this.jwt.verifyAsync<GuestOrderTrackingPayload>(token, {
        secret: GUEST_TRACKING_SECRET,
        algorithms: ["HS256"],
      });
      if (payload.kind !== "guest-order-tracking" || !payload.orderId) {
        throw new UnauthorizedException("Session de suivi invalide");
      }
      req.guestOrderId = payload.orderId;
      return true;
    } catch {
      throw new UnauthorizedException("Session de suivi manquante ou expirée");
    }
  }
}
