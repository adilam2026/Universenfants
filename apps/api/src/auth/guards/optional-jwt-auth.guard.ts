import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/**
 * Comme JwtAuthGuard, mais n'échoue jamais : utile pour les routes accessibles
 * en invité (panier, wishlist) où un client connecté bénéficie simplement
 * d'un rattachement automatique de son panier à son compte.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard("jwt") {
  handleRequest<TUser = unknown>(_err: unknown, user: TUser): TUser {
    return (user ?? null) as TUser;
  }
}
