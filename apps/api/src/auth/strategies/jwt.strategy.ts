import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { JwtPayload } from "../types";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret",
      // Explicite plutôt qu'implicite : empêche qu'un token forgé avec un
      // autre algorithme (ou "none") soit accepté si le comportement par
      // défaut de la librairie venait à changer.
      algorithms: ["HS256"],
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    return payload;
  }
}
