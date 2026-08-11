import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditLogService } from "../../common/audit-log.service";
import { runCatchingDuplicate } from "../../common/prisma-errors.util";
import type { UpsertBrandDto } from "./dto/upsert-brand.dto";

@Injectable()
export class BrandsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  // Route admin uniquement (aucun usage côté web public) — renvoie toutes
  // les marques quel que soit leur statut, sinon une marque archivée
  // disparaissait purement et simplement de la liste, sans aucun moyen de
  // la retrouver pour la réactiver.
  list() {
    return this.prisma.brand.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    });
  }

  // Route publique (filtre "Marque" du catalogue) — seulement les marques
  // actives ayant au moins un produit actif : lister une marque archivée ou
  // sans aucun produit visible donnerait un filtre qui ne renvoie jamais
  // rien une fois sélectionné.
  async listActive() {
    const brands = await this.prisma.brand.findMany({
      where: { status: "ACTIVE", products: { some: { status: "ACTIVE" } } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    });
    return brands;
  }

  async create(dto: UpsertBrandDto, staffUserId: string) {
    const created = await runCatchingDuplicate(
      () => this.prisma.brand.create({ data: dto }),
      "Une marque avec ce nom ou cette URL existe déjà",
    );
    await this.auditLog.record({ staffUserId, action: "brand.create", entity: "Brand", entityId: created.id, newValue: dto });
    return created;
  }

  async update(id: string, dto: UpsertBrandDto, staffUserId: string) {
    const found = await this.prisma.brand.findUnique({ where: { id } });
    if (!found) throw new NotFoundException("Marque introuvable");
    const updated = await runCatchingDuplicate(
      () => this.prisma.brand.update({ where: { id }, data: dto }),
      "Une marque avec ce nom ou cette URL existe déjà",
    );
    await this.auditLog.record({ staffUserId, action: "brand.update", entity: "Brand", entityId: id, newValue: dto });
    return updated;
  }

  async archive(id: string, staffUserId: string) {
    const found = await this.prisma.brand.findUnique({ where: { id } });
    if (!found) throw new NotFoundException("Marque introuvable");
    // Même garde-fou que categories.service.ts#archive : une marque encore
    // utilisée par des produits actifs ne doit pas disparaître silencieusement.
    const productsUsingBrand = await this.prisma.product.count({ where: { brandId: id, status: "ACTIVE" } });
    if (productsUsingBrand > 0) {
      throw new BadRequestException(
        `Impossible d'archiver : ${productsUsingBrand} produit(s) actif(s) sont encore rattachés à cette marque`,
      );
    }
    const archived = await this.prisma.brand.update({ where: { id }, data: { status: "ARCHIVED" } });
    await this.auditLog.record({ staffUserId, action: "brand.archive", entity: "Brand", entityId: id });
    return archived;
  }
}
