import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/** Vérifie uniquement qu'un JWT valide est présent (customer ou staff). */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}
