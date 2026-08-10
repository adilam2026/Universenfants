import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PricingService } from "../catalog/pricing/pricing.service";
import { AuditLogService } from "../common/audit-log.service";

export interface BundleItemInput {
  productId: string;
  quantity?: number;
}

export interface UpsertBundleFields {
  name: string;
  bundlePrice: number;
  startAt?: string;
  endAt?: string;
  status?: "DRAFT" | "SCHEDULED" | "ACTIVE" | "ENDED";
  items: BundleItemInput[];
}

/** Bundle/BundleItem existaient en base sans aucun contrôleur ni UI — table
 * morte. Implémenté ici comme regroupement marchandising (affichage + ajout
 * groupé au panier au prix réel de chaque article) : appliquer réellement
 * bundlePrice au checkout nécessiterait d'ajouter un bundleId à CartLine et
 * de modifier la logique de tarification du panier — un changement de
 * schéma plus significatif, touchant un chemin financier critique, qu'il
 * n'a pas semblé raisonnable de précipiter. Le prix de lot reste affiché à
 * titre indicatif (« économisez X DH en achetant ces articles ensemble »). */
@Injectable()
export class BundlesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
    private readonly auditLog: AuditLogService,
  ) {}

  list() {
    return this.prisma.bundle.findMany({
      orderBy: { createdAt: "desc" },
      include: { items: { include: { product: { select: { id: true, nameFr: true, sku: true } } } } },
    });
  }

  async listActive() {
    const now = new Date();
    const bundles = await this.prisma.bundle.findMany({
      where: { status: "ACTIVE" },
      include: { items: { include: { product: { include: { images: { take: 1, orderBy: { order: "asc" } } } } } } },
    });
    const active = await this.pricing.getActivePromotions();
    return bundles
      .filter((b) => (!b.startAt || b.startAt <= now) && (!b.endAt || b.endAt >= now))
      .filter((b) => b.items.every((i) => i.product.status === "ACTIVE"))
      .map((b) => {
        const items = b.items.map((i) => {
          const resolved = this.pricing.resolveForProduct(i.product, active);
          return {
            productId: i.product.id,
            nameFr: i.product.nameFr,
            nameAr: i.product.nameAr,
            seoUrl: i.product.seoUrl,
            image: i.product.images[0]?.url ?? null,
            quantity: i.quantity,
            unitPrice: resolved.price,
          };
        });
        const individualTotal = items.reduce((sum, i) => sum + Number(i.unitPrice) * i.quantity, 0);
        return {
          id: b.id,
          name: b.name,
          bundlePrice: Number(b.bundlePrice),
          individualTotal,
          savings: Math.max(0, individualTotal - Number(b.bundlePrice)),
          items,
        };
      });
  }

  async create(fields: UpsertBundleFields, staffUserId: string) {
    this.assertValid(fields);
    const created = await this.prisma.bundle.create({
      data: {
        name: fields.name,
        bundlePrice: fields.bundlePrice,
        startAt: fields.startAt ? new Date(fields.startAt) : null,
        endAt: fields.endAt ? new Date(fields.endAt) : null,
        status: fields.status ?? "ACTIVE",
        items: { create: fields.items.map((i) => ({ productId: i.productId, quantity: i.quantity ?? 1 })) },
      },
      include: { items: { include: { product: { select: { id: true, nameFr: true, sku: true } } } } },
    });
    await this.auditLog.record({ staffUserId, action: "bundle.create", entity: "Bundle", entityId: created.id, newValue: fields });
    return created;
  }

  async update(id: string, fields: UpsertBundleFields, staffUserId: string) {
    const existing = await this.prisma.bundle.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Bundle introuvable");
    this.assertValid(fields);
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.bundleItem.deleteMany({ where: { bundleId: id } });
      return tx.bundle.update({
        where: { id },
        data: {
          name: fields.name,
          bundlePrice: fields.bundlePrice,
          startAt: fields.startAt ? new Date(fields.startAt) : null,
          endAt: fields.endAt ? new Date(fields.endAt) : null,
          status: fields.status,
          items: { create: fields.items.map((i) => ({ productId: i.productId, quantity: i.quantity ?? 1 })) },
        },
        include: { items: { include: { product: { select: { id: true, nameFr: true, sku: true } } } } },
      });
    });
    await this.auditLog.record({ staffUserId, action: "bundle.update", entity: "Bundle", entityId: id, newValue: fields });
    return updated;
  }

  async remove(id: string, staffUserId: string) {
    const existing = await this.prisma.bundle.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Bundle introuvable");
    await this.prisma.bundle.delete({ where: { id } });
    await this.auditLog.record({ staffUserId, action: "bundle.delete", entity: "Bundle", entityId: id });
    return { ok: true };
  }

  private assertValid(fields: UpsertBundleFields) {
    if (!fields.name?.trim()) throw new BadRequestException("Nom requis");
    if (!Number.isFinite(fields.bundlePrice) || fields.bundlePrice < 0) throw new BadRequestException("Prix de lot invalide");
    if (!fields.items || fields.items.length < 2) throw new BadRequestException("Un lot doit contenir au moins 2 produits");
  }
}
