import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditLogService } from "../../common/audit-log.service";
import { runCatchingDuplicate } from "../../common/prisma-errors.util";
import type { UpsertCategoryDto } from "./dto/upsert-category.dto";

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  /** Arborescence complète (BO-06 vue arborescente + navigation Front). */
  async tree() {
    const all = await this.prisma.category.findMany({
      where: { status: "ACTIVE" },
      orderBy: { order: "asc" },
      include: { _count: { select: { products: true } } },
    });
    const byParent = new Map<string | null, typeof all>();
    for (const cat of all) {
      const key = cat.parentId ?? null;
      byParent.set(key, [...(byParent.get(key) ?? []), cat]);
    }
    const build = (parentId: string | null): unknown[] =>
      (byParent.get(parentId) ?? []).map((c) => ({
        id: c.id,
        slug: c.slug,
        nameFr: c.nameFr,
        nameAr: c.nameAr,
        image: c.image,
        metaTitle: c.metaTitle,
        metaDescription: c.metaDescription,
        productCount: c._count.products,
        children: build(c.id),
      }));
    return build(null);
  }

  async findBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({ where: { slug } });
    if (!category) throw new NotFoundException("Catégorie introuvable");
    return category;
  }

  list() {
    return this.prisma.category.findMany({ orderBy: { order: "asc" } });
  }

  async create(dto: UpsertCategoryDto, staffUserId: string) {
    const created = await runCatchingDuplicate(
      () => this.prisma.category.create({ data: dto }),
      "Cette URL de catégorie (slug) est déjà utilisée",
    );
    await this.auditLog.record({ staffUserId, action: "category.create", entity: "Category", entityId: created.id, newValue: dto });
    return created;
  }

  async update(id: string, dto: UpsertCategoryDto, staffUserId: string) {
    await this.ensureExists(id);
    const updated = await runCatchingDuplicate(
      () => this.prisma.category.update({ where: { id }, data: dto }),
      "Cette URL de catégorie (slug) est déjà utilisée",
    );
    await this.auditLog.record({ staffUserId, action: "category.update", entity: "Category", entityId: id, newValue: dto });
    return updated;
  }

  async archive(id: string, staffUserId: string) {
    await this.ensureExists(id);
    // tree() (navigation catégorie côté Front) ne renvoie que les catégories
    // ACTIVE — sans ce garde-fou, archiver une catégorie encore utilisée par
    // des produits actifs les rendait injoignables par la navigation
    // catégorie (leur fiche produit reste accessible directement, mais plus
    // aucun chemin de navigation n'y mène), sans le moindre avertissement.
    const productsUsingCategory = await this.prisma.product.count({ where: { categoryId: id, status: "ACTIVE" } });
    if (productsUsingCategory > 0) {
      throw new BadRequestException(
        `Impossible d'archiver : ${productsUsingCategory} produit(s) actif(s) sont encore rattachés à cette catégorie`,
      );
    }
    const archived = await this.prisma.category.update({ where: { id }, data: { status: "ARCHIVED" } });
    await this.auditLog.record({ staffUserId, action: "category.archive", entity: "Category", entityId: id });
    return archived;
  }

  private async ensureExists(id: string) {
    const found = await this.prisma.category.findUnique({ where: { id } });
    if (!found) throw new NotFoundException("Catégorie introuvable");
  }
}
