import { BadRequestException } from "@nestjs/common";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Résout et valide une plage (startAt, endAt) pour un coupon ou une
 * promotion. Deux bugs corrigés ici :
 * - Le formulaire admin envoie des dates sans heure ("2026-08-09"), que
 *   `new Date(...)` interprète comme minuit UTC. Sans ajustement, un coupon
 *   dont la date de fin est "aujourd'hui" expire dès sa création pour tout
 *   admin situé à l'est de UTC (ex. Maroc, UTC+1) — endAt tombe déjà dans le
 *   passé au moment du POST. On étend donc une date de fin sans heure à la
 *   fin de journée (23:59:59.999 UTC).
 * - Rien ne validait startAt < endAt : un coupon/promotion créé avec les
 *   dates inversées était accepté et affiché "ACTIF" côté admin, mais ne
 *   pouvait jamais être appliqué (aucun instant ne satisfait à la fois
 *   startAt <= now et endAt >= now) — inerte sans qu'aucune erreur ne soit
 *   jamais remontée. */
export function resolveDateRange(rawStartAt: string, rawEndAt: string): { startAt: Date; endAt: Date } {
  const startAt = new Date(rawStartAt);
  const endAt = DATE_ONLY.test(rawEndAt) ? new Date(`${rawEndAt}T23:59:59.999Z`) : new Date(rawEndAt);

  if (startAt.getTime() >= endAt.getTime()) {
    throw new BadRequestException("La date de fin doit être postérieure à la date de début");
  }

  return { startAt, endAt };
}
