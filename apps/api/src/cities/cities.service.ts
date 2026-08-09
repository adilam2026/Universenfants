import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { UpsertCityDto } from "./dto/upsert-city.dto";

@Injectable()
export class CitiesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.city.findMany({ include: { group: true }, orderBy: { name: "asc" } });
  }

  async create(dto: UpsertCityDto) {
    try {
      return await this.prisma.city.create({ data: dto });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new BadRequestException("Une ville avec ce nom existe déjà");
      }
      throw err;
    }
  }

  async update(id: string, dto: UpsertCityDto) {
    const existing = await this.prisma.city.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Ville introuvable");
    try {
      return await this.prisma.city.update({ where: { id }, data: dto });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new BadRequestException("Une ville avec ce nom existe déjà");
      }
      throw err;
    }
  }
}
