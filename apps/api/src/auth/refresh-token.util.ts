import { createHash } from "node:crypto";

/** On ne stocke jamais le refresh token en clair — un accès en lecture à la
 * table (backup, dump, requête admin) ne doit pas suffire à usurper une
 * session. Le hash sert uniquement à retrouver/révoquer l'enregistrement ;
 * la validité cryptographique du token reste vérifiée par sa signature JWT. */
export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
