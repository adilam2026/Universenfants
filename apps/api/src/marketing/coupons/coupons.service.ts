import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { UpsertCouponDto } from "./dto/upsert-coupon.dto";

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  }

  create(dto: UpsertCouponDto) {
    return this.prisma.coupon.create({
      data: {
        code: dto.code.toUpperCase(),
        type: dto.type,
        value: dto.value,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        maxUses: dto.maxUses,
        maxUsesPerCustomer: dto.maxUsesPerCustomer ?? 1,
        minCartAmount: dto.minCartAmount ?? 0,
        status: dto.status ?? "ACTIVE",
      },
    });
  }

  async update(id: string, dto: UpsertCouponDto) {
    const existing = await this.prisma.coupon.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Coupon introuvable");
    return this.prisma.coupon.update({
      where: { id },
      data: {
        code: dto.code.toUpperCase(),
        type: dto.type,
        value: dto.value,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        maxUses: dto.maxUses,
        maxUsesPerCustomer: dto.maxUsesPerCustomer ?? 1,
        minCartAmount: dto.minCartAmount ?? 0,
        status: dto.status ?? existing.status,
      },
    });
  }
}
