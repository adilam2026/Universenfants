import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditLogService } from "../common/audit-log.service";
import type { UpsertCityDto } from "./dto/upsert-city.dto";

@Injectable()
export class CitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  list() {
    return this.prisma.city.findMany({ include: { group: true }, orderBy: { name: "asc" } });
  }

  async create(dto: UpsertCityDto, staffUserId: string) {
    try {
      // Écriture atomique avec sa trace d'audit (frais de livraison — impact
      // direct sur le total facturé) : soit les deux persistent, soit aucune.
      return await this.prisma.$transaction(async (tx) => {
        const created = await tx.city.create({ data: dto });
        await this.auditLog.record(
          { staffUserId, action: "city.create", entity: "City", entityId: created.id, newValue: dto },
          tx,
        );
        return created;
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new BadRequestException("Une ville avec ce nom existe déjà");
      }
      throw err;
    }
  }

  async update(id: string, dto: UpsertCityDto, staffUserId: string) {
    const existing = await this.prisma.city.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Ville introuvable");
    try {
      return await this.prisma.$transaction(async (tx) => {
        const updated = await tx.city.update({ where: { id }, data: dto });
        await this.auditLog.record(
          { staffUserId, action: "city.update", entity: "City", entityId: id, oldValue: existing, newValue: dto },
          tx,
        );
        return updated;
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new BadRequestException("Une ville avec ce nom existe déjà");
      }
      throw err;
    }
  }
}
