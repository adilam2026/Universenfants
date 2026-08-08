import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import type { PermissionCode } from "@universenfants/shared";
import { PrismaService } from "../../prisma/prisma.service";
import { PERMISSIONS_KEY } from "../decorators/require-permissions.decorator";
import type { RequestUser } from "../types";

/**
 * Résout l'ensemble effectif de permissions d'un StaffUser : celles de son
 * rôle, plus les octrois complémentaires, moins les restrictions explicites
 * (§171 "peut avoir des permissions supplémentaires / restrictions spécifiques").
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<PermissionCode[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<Request & { user?: RequestUser }>();
    const user = req.user;
    if (!user || user.kind !== "staff") {
      throw new ForbiddenException("Accès réservé au Back-Office");
    }

    const staff = await this.prisma.staffUser.findUnique({
      where: { id: user.sub },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
        extraPermissions: { include: { permission: true } },
      },
    });
    if (!staff || !staff.active) {
      throw new ForbiddenException("Compte désactivé");
    }

    // SUPER_ADMIN a toujours accès total (§172).
    if (staff.role.code === "SUPER_ADMIN") return true;

    const granted = new Set(staff.role.permissions.map((rp) => rp.permission.code));
    for (const extra of staff.extraPermissions) {
      if (extra.granted) granted.add(extra.permission.code);
      else granted.delete(extra.permission.code);
    }

    const missing = required.filter((code) => !granted.has(code));
    if (missing.length > 0) {
      throw new ForbiddenException(`Permission(s) manquante(s) : ${missing.join(", ")}`);
    }
    return true;
  }
}
