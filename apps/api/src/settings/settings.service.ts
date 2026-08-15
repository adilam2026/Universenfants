import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditLogService } from "../common/audit-log.service";
import {
  DEFAULT_VAT_RATE,
  DEFAULT_LOYALTY_REDEEM_RATE,
  DEFAULT_GLOBAL_FREE_SHIPPING_THRESHOLD,
} from "@universenfants/shared";
import type { UpdateSettingsDto } from "./dto/update-settings.dto";

const KEYS = {
  vatRate: "vat_rate",
  loyaltyRedeemRate: "loyalty_redeem_rate",
  freeShippingThreshold: "free_shipping_threshold",
  whatsappOrderNumber: "whatsapp_order_number",
} as const;

const DEFAULTS = {
  vatRate: DEFAULT_VAT_RATE,
  loyaltyRedeemRate: DEFAULT_LOYALTY_REDEEM_RATE,
  freeShippingThreshold: DEFAULT_GLOBAL_FREE_SHIPPING_THRESHOLD,
};

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async get() {
    const rows = await this.prisma.systemSetting.findMany({
      where: { key: { in: Object.values(KEYS) } },
    });
    const byKey = new Map(rows.map((r) => [r.key, r.value]));
    return {
      vatRate: (byKey.get(KEYS.vatRate) as number | undefined) ?? DEFAULTS.vatRate,
      loyaltyRedeemRate: (byKey.get(KEYS.loyaltyRedeemRate) as number | undefined) ?? DEFAULTS.loyaltyRedeemRate,
      freeShippingThreshold: (byKey.get(KEYS.freeShippingThreshold) as number | undefined) ?? DEFAULTS.freeShippingThreshold,
      // Pas de valeur par défaut sensée pour un numéro de téléphone — null
      // tant qu'aucun admin ne l'a saisi, ce qui masque le bouton "Commander
      // via WhatsApp" côté boutique plutôt que d'afficher un lien cassé.
      whatsappOrderNumber: (byKey.get(KEYS.whatsappOrderNumber) as string | undefined) || null,
    };
  }

  async update(dto: UpdateSettingsDto, staffUserId: string) {
    const before = await this.get();
    await this.prisma.$transaction(async (tx) => {
      await tx.systemSetting.upsert({
        where: { key: KEYS.vatRate },
        update: { value: dto.vatRate },
        create: { key: KEYS.vatRate, value: dto.vatRate },
      });
      await tx.systemSetting.upsert({
        where: { key: KEYS.loyaltyRedeemRate },
        update: { value: dto.loyaltyRedeemRate },
        create: { key: KEYS.loyaltyRedeemRate, value: dto.loyaltyRedeemRate },
      });
      await tx.systemSetting.upsert({
        where: { key: KEYS.freeShippingThreshold },
        update: { value: dto.freeShippingThreshold },
        create: { key: KEYS.freeShippingThreshold, value: dto.freeShippingThreshold },
      });
      // Champ optionnel : seule sa présence explicite dans le DTO (y compris
      // une chaîne vide, pour l'effacer) déclenche l'écriture — sinon un
      // ancien client d'API n'envoyant pas ce champ écraserait silencieusement
      // le numéro déjà enregistré à chaque sauvegarde.
      if (dto.whatsappOrderNumber !== undefined) {
        await tx.systemSetting.upsert({
          where: { key: KEYS.whatsappOrderNumber },
          update: { value: dto.whatsappOrderNumber },
          create: { key: KEYS.whatsappOrderNumber, value: dto.whatsappOrderNumber },
        });
      }
      // Paramètres globaux (TVA, taux de conversion fidélité, seuil de
      // livraison offerte) : impact direct et immédiat sur tous les prix
      // affichés/facturés — trace d'audit atomique avec l'écriture elle-même.
      await this.auditLog.record(
        {
          staffUserId,
          action: "settings.update",
          entity: "SystemSetting",
          entityId: "global",
          oldValue: before,
          newValue: dto,
        },
        tx,
      );
    });
    return this.get();
  }
}
