import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import type { PermissionCode } from "@universenfants/shared";
import { PrismaService } from "../../prisma/prisma.service";
import { PERMISSIONS_KEY } from "../decorators/require-permissions.decorator";
import { resolveStaffPermissions } from "../staff-permissions.util";
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

    const resolved = await resolveStaffPermissions(this.prisma, user.sub);
    if (!resolved) {
      throw new ForbiddenException("Compte désactivé");
    }
    if (resolved.roleCode === "SUPER_ADMIN") return true;

    const granted = new Set(resolved.permissions);
    const missing = required.filter((code) => !granted.has(code));
    if (missing.length > 0) {
      throw new ForbiddenException(`Permission(s) manquante(s) : ${missing.join(", ")}`);
    }
    return true;
  }
}
