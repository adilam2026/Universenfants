import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
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
} as const;

const DEFAULTS = {
  vatRate: DEFAULT_VAT_RATE,
  loyaltyRedeemRate: DEFAULT_LOYALTY_REDEEM_RATE,
  freeShippingThreshold: DEFAULT_GLOBAL_FREE_SHIPPING_THRESHOLD,
};

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    const rows = await this.prisma.systemSetting.findMany({
      where: { key: { in: Object.values(KEYS) } },
    });
    const byKey = new Map(rows.map((r) => [r.key, r.value as number]));
    return {
      vatRate: byKey.get(KEYS.vatRate) ?? DEFAULTS.vatRate,
      loyaltyRedeemRate: byKey.get(KEYS.loyaltyRedeemRate) ?? DEFAULTS.loyaltyRedeemRate,
      freeShippingThreshold: byKey.get(KEYS.freeShippingThreshold) ?? DEFAULTS.freeShippingThreshold,
    };
  }

  async update(dto: UpdateSettingsDto) {
    await this.prisma.$transaction([
      this.prisma.systemSetting.upsert({
        where: { key: KEYS.vatRate },
        update: { value: dto.vatRate },
        create: { key: KEYS.vatRate, value: dto.vatRate },
      }),
      this.prisma.systemSetting.upsert({
        where: { key: KEYS.loyaltyRedeemRate },
        update: { value: dto.loyaltyRedeemRate },
        create: { key: KEYS.loyaltyRedeemRate, value: dto.loyaltyRedeemRate },
      }),
      this.prisma.systemSetting.upsert({
        where: { key: KEYS.freeShippingThreshold },
        update: { value: dto.freeShippingThreshold },
        create: { key: KEYS.freeShippingThreshold, value: dto.freeShippingThreshold },
      }),
    ]);
    return this.get();
  }
}
