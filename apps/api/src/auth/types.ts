export type AuthKind = "customer" | "staff";

export interface JwtPayload {
  sub: string;
  kind: AuthKind;
  email?: string | null;
  roleCode?: string; // staff only
  // Rend chaque token signé unique même si émis dans la même seconde pour le
  // même compte (iat n'a qu'une précision à la seconde) — sans ça, deux
  // refresh tokens identiques (même payload, même iat/exp) produisent le
  // même hash et violent la contrainte unique en base (RefreshToken.tokenHash).
  jti?: string;
}

export type RequestUser = JwtPayload;
