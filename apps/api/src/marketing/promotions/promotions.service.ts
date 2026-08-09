import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditLogService } from "../../common/audit-log.service";
import type { UpsertPromotionDto } from "./dto/upsert-promotion.dto";

@Injectable()
export class PromotionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

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

  async create(dto: UpsertPromotionDto, staffUserId: string) {
    await this.assertConsistentScope(dto);
    const data = {
      name: dto.name,
      type: dto.type,
      value: dto.value,
      scope: dto.scope,
      categoryId: dto.scope === "CATEGORY" ? dto.categoryId : undefined,
      brandId: dto.scope === "BRAND" ? dto.brandId : undefined,
      startAt: new Date(dto.startAt),
      endAt: new Date(dto.endAt),
      status: dto.status ?? "SCHEDULED",
    };
    // Écriture atomique avec sa trace d'audit (impact direct sur les prix
    // affichés/facturés) : soit les deux persistent, soit aucune.
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.promotion.create({ data });
      await this.auditLog.record(
        { staffUserId, action: "promotion.create", entity: "Promotion", entityId: created.id, newValue: data },
        tx,
      );
      return created;
    });
  }

  async update(id: string, dto: UpsertPromotionDto, staffUserId: string) {
    const existing = await this.prisma.promotion.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Promotion introuvable");
    await this.assertConsistentScope(dto);
    const data = {
      name: dto.name,
      type: dto.type,
      value: dto.value,
      scope: dto.scope,
      categoryId: dto.scope === "CATEGORY" ? dto.categoryId : null,
      brandId: dto.scope === "BRAND" ? dto.brandId : null,
      startAt: new Date(dto.startAt),
      endAt: new Date(dto.endAt),
      status: dto.status ?? existing.status,
    };
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.promotion.update({ where: { id }, data });
      await this.auditLog.record(
        { staffUserId, action: "promotion.update", entity: "Promotion", entityId: id, oldValue: existing, newValue: data },
        tx,
      );
      return updated;
    });
  }
}
