import * as argon2 from "argon2";

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain);
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  return argon2.verify(hash, plain);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Identifiant de connexion unique = email OU téléphone, détecté automatiquement (I2). */
export function detectIdentifierKind(identifier: string): "email" | "phone" {
  return EMAIL_RE.test(identifier) ? "email" : "phone";
}
