import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export interface AuditLogEntry {
  staffUserId: string;
  action: string;
  entity: string;
  entityId: string;
  /** N'importe quelle valeur — y compris un objet Prisma complet (Coupon,
   * City...) avec des champs Decimal/Date, normalisée en JSON simple avant
   * stockage. */
  oldValue?: unknown;
  newValue?: unknown;
}

// Prisma.Decimal implémente toJSON() (renvoie une chaîne), qui s'exécute
// AVANT tout replacer JSON.stringify — impossible de le distinguer là d'un
// champ texte normal. Sans cette normalisation récursive en amont, oldValue
// (construit à partir d'une ligne Prisma brute, donc avec de vrais Decimal)
// stockait ses montants en chaînes ("25") tandis que newValue (construit à
// partir du DTO déjà validé) les stockait en nombres (25) — un même champ
// prenait deux types différents entre avant/après dans la même entrée
// d'audit, rendant toute comparaison ou tout diff automatisé peu fiable.
function normalizeForAudit(value: unknown): unknown {
  if (value instanceof Prisma.Decimal) return value.toNumber();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalizeForAudit);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, normalizeForAudit(v)]));
  }
  return value;
}

function toJsonValue(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  return normalizeForAudit(value) as Prisma.InputJsonValue;
}

/** Trace centralisée des actions Back-Office sensibles (coupons, promotions,
 * paramètres, villes...) — qui a changé quoi et quand, avec l'ancienne et la
 * nouvelle valeur. Accepte un client de transaction optionnel pour que
 * l'écriture d'audit et la modification qu'elle documente soient atomiques
 * (les deux réussissent, ou aucune ne persiste) plutôt que deux écritures
 * indépendantes pouvant diverger l'une de l'autre. */
@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  record(entry: AuditLogEntry, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).auditLog.create({
      data: {
        staffUserId: entry.staffUserId,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        oldValue: toJsonValue(entry.oldValue),
        newValue: toJsonValue(entry.newValue),
      },
    });
  }
}
