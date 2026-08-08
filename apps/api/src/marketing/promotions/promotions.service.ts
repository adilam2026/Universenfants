import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { UpsertPromotionDto } from "./dto/upsert-promotion.dto";

@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.promotion.findMany({
      include: { category: true, brand: true },
      orderBy: { createdAt: "desc" },
    });
  }

  create(dto: UpsertPromotionDto) {
    return this.prisma.promotion.create({
      data: {
        name: dto.name,
        type: dto.type,
        value: dto.value,
        scope: dto.scope,
        categoryId: dto.scope === "CATEGORY" ? dto.categoryId : undefined,
        brandId: dto.scope === "BRAND" ? dto.brandId : undefined,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        status: dto.status ?? "SCHEDULED",
      },
    });
  }

  async update(id: string, dto: UpsertPromotionDto) {
    const existing = await this.prisma.promotion.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Promotion introuvable");
    return this.prisma.promotion.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type,
        value: dto.value,
        scope: dto.scope,
        categoryId: dto.scope === "CATEGORY" ? dto.categoryId : null,
        brandId: dto.scope === "BRAND" ? dto.brandId : null,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        status: dto.status ?? existing.status,
      },
    });
  }
}
