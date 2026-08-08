import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { UpsertBrandDto } from "./dto/upsert-brand.dto";

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.brand.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    });
  }

  async create(dto: UpsertBrandDto) {
    return this.prisma.brand.create({ data: dto });
  }

  async update(id: string, dto: UpsertBrandDto) {
    const found = await this.prisma.brand.findUnique({ where: { id } });
    if (!found) throw new NotFoundException("Marque introuvable");
    return this.prisma.brand.update({ where: { id }, data: dto });
  }
}
