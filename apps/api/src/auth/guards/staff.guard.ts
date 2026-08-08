import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from "@nestjs/common";
import type { Request } from "express";
import type { RequestUser } from "../types";

/** À combiner après JwtAuthGuard : n'autorise que les tokens "staff" (jamais un client). */
@Injectable()
export class StaffGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request & { user?: RequestUser }>();
    if (req.user?.kind !== "staff") {
      throw new ForbiddenException("Accès réservé au Back-Office");
    }
    return true;
  }
}
