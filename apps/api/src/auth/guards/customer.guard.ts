import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import type { Request } from "express";
import type { RequestUser } from "../types";

/** À combiner après JwtAuthGuard : n'autorise que les tokens "customer". */
@Injectable()
export class CustomerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request & { user?: RequestUser }>();
    if (req.user?.kind !== "customer") {
      throw new ForbiddenException("Accès réservé aux clients connectés");
    }
    return true;
  }
}
