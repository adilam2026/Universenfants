import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { UpsertCityDto } from "./dto/upsert-city.dto";

@Injectable()
export class CitiesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.city.findMany({ include: { group: true }, orderBy: { name: "asc" } });
  }

  create(dto: UpsertCityDto) {
    return this.prisma.city.create({ data: dto });
  }

  async update(id: string, dto: UpsertCityDto) {
    const existing = await this.prisma.city.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Ville introuvable");
    return this.prisma.city.update({ where: { id }, data: dto });
  }
}
