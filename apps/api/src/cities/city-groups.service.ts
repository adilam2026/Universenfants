import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditLogService } from "../common/audit-log.service";
import type { UpsertCityGroupDto } from "./dto/upsert-city-group.dto";

/** CityGroup existait en base (avec sa propre cascade de seuil de livraison
 * gratuite déjà lue par CitiesService#listPublic) mais aucune route ne
 * permettait d'en créer un ni d'y rattacher une ville — la colonne "Groupe"
 * du Back-Office restait donc systématiquement vide en pratique. */
@Injectable()
export class CityGroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  list() {
    return this.prisma.cityGroup.findMany({ include: { cities: { select: { id: true, name: true } } }, orderBy: { name: "asc" } });
  }

  async create(dto: UpsertCityGroupDto, staffUserId: string) {
    try {
      const created = await this.prisma.cityGroup.create({ data: dto });
      await this.auditLog.record({ staffUserId, action: "cityGroup.create", entity: "CityGroup", entityId: created.id, newValue: dto });
      return created;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new BadRequestException("Un groupe de villes avec ce nom existe déjà");
      }
      throw err;
    }
  }

  async update(id: string, dto: UpsertCityGroupDto, staffUserId: string) {
    const existing = await this.prisma.cityGroup.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Groupe de villes introuvable");
    try {
      const updated = await this.prisma.cityGroup.update({ where: { id }, data: dto });
      await this.auditLog.record({ staffUserId, action: "cityGroup.update", entity: "CityGroup", entityId: id, oldValue: existing, newValue: dto });
      return updated;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new BadRequestException("Un groupe de villes avec ce nom existe déjà");
      }
      throw err;
    }
  }

  async remove(id: string, staffUserId: string) {
    const existing = await this.prisma.cityGroup.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Groupe de villes introuvable");
    // Détache les villes plutôt que de bloquer la suppression : un groupe
    // vidé de son sens (ex: fusion de zones) doit pouvoir être supprimé sans
    // obliger l'admin à d'abord retirer chaque ville une par une.
    await this.prisma.$transaction([
      this.prisma.city.updateMany({ where: { groupId: id }, data: { groupId: null } }),
      this.prisma.cityGroup.delete({ where: { id } }),
    ]);
    await this.auditLog.record({ staffUserId, action: "cityGroup.delete", entity: "CityGroup", entityId: id, oldValue: existing });
    return { ok: true };
  }
}
