import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { runCatchingDuplicate } from "../../common/prisma-errors.util";
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
    return runCatchingDuplicate(() => this.prisma.brand.create({ data: dto }), "Une marque avec ce nom ou cette URL existe déjà");
  }

  async update(id: string, dto: UpsertBrandDto) {
    const found = await this.prisma.brand.findUnique({ where: { id } });
    if (!found) throw new NotFoundException("Marque introuvable");
    return runCatchingDuplicate(
      () => this.prisma.brand.update({ where: { id }, data: dto }),
      "Une marque avec ce nom ou cette URL existe déjà",
    );
  }
}
