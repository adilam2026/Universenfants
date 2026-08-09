import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
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

  // Le moteur de prix (pricing.service.ts) n'applique une promotion CATEGORY/
  // BRAND que si son categoryId/brandId respectif est renseigné — sans cette
  // validation, une promotion créée avec le mauvais scope/id serait acceptée
  // silencieusement et n'aurait jamais d'effet sur aucun prix, reproduisant
  // exactement le bug de fonctionnalité déconnectée signalé sur Promotions.
  private async assertConsistentScope(dto: UpsertPromotionDto) {
    if (dto.type === "PERCENTAGE" && dto.value > 100) {
      throw new BadRequestException("Une remise en pourcentage ne peut pas dépasser 100 %");
    }
    if (dto.scope === "CATEGORY") {
      if (!dto.categoryId) throw new BadRequestException("Une promotion catégorie doit préciser la catégorie");
      const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
      if (!category) throw new BadRequestException("Catégorie introuvable");
    } else if (dto.scope === "BRAND") {
      if (!dto.brandId) throw new BadRequestException("Une promotion marque doit préciser la marque");
      const brand = await this.prisma.brand.findUnique({ where: { id: dto.brandId } });
      if (!brand) throw new BadRequestException("Marque introuvable");
    }
  }

  async create(dto: UpsertPromotionDto) {
    await this.assertConsistentScope(dto);
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
    await this.assertConsistentScope(dto);
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
