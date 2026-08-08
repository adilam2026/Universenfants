import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma, PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import { PrismaService } from "../../prisma/prisma.service";
import type { QueryProductsDto } from "./dto/query-products.dto";
import type { UpsertProductDto } from "./dto/upsert-product.dto";
import type { AdjustStockDto } from "./dto/adjust-stock.dto";

interface ImportRow {
  SKU?: unknown;
  Nom?: unknown;
  Catégorie?: unknown;
  Marque?: unknown;
  Prix?: unknown;
  "Prix de revient"?: unknown;
  Stock?: unknown;
  "URL SEO"?: unknown;
  "Âge min"?: unknown;
  "Âge max"?: unknown;
  Statut?: unknown;
}

interface ImportRowResult {
  row: number;
  sku: string;
  status: "created" | "updated" | "error";
  message?: string;
}

/** Une commande transitant par cette interface pour réserver/libérer/décrémenter du stock. */
export interface StockLine {
  productId: string;
  variantId?: string | null;
  quantity: number;
}

// Le client Prisma "normal" ou celui fourni par $transaction — les deux exposent la même API.
type Tx = PrismaClient | Prisma.TransactionClient;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: QueryProductsDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 24, 100);

    const where: Prisma.ProductWhereInput = { status: "ACTIVE" };
    if (query.category) where.category = { slug: query.category };
    if (query.brand) where.brand = { slug: query.brand };
    if (query.q) where.nameFr = { contains: query.q, mode: "insensitive" };
    if (query.ageMin !== undefined) where.ageMax = { gte: query.ageMin };
    if (query.ageMax !== undefined) where.ageMin = { lte: query.ageMax };
    if (query.promoOnly) where.promoPrice = { not: null };
    if (query.inStockOnly) where.stock = { gt: 0 };
    if (query.priceMin !== undefined || query.priceMax !== undefined) {
      where.price = {
        ...(query.priceMin !== undefined ? { gte: query.priceMin } : {}),
        ...(query.priceMax !== undefined ? { lte: query.priceMax } : {}),
      };
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      query.sort === "price_asc"
        ? { price: "asc" }
        : query.sort === "price_desc"
          ? { price: "desc" }
          : query.sort === "newest"
            ? { createdAt: "desc" }
            : { createdAt: "desc" }; // "relevance"/"bestsellers" affinés une fois Meilisearch branché

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: { images: { orderBy: { order: "asc" }, take: 1 }, brand: true, category: true },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items: items.map((p) => this.toPublicShape(p)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findBySlug(slug: string, sessionId?: string) {
    const product = await this.prisma.product.findUnique({
      where: { seoUrl: slug },
      include: {
        images: { orderBy: { order: "asc" } },
        variants: true,
        brand: true,
        category: true,
        reviews: { where: { status: "APPROVED" }, orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
    if (!product || product.status !== "ACTIVE") throw new NotFoundException("Produit introuvable");

    if (sessionId) {
      // fire-and-forget, ne doit jamais bloquer l'affichage de la fiche produit
      this.prisma.productView.create({ data: { productId: product.id, sessionId } }).catch(() => undefined);
    }

    const avgRating =
      product.reviews.length > 0
        ? product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length
        : null;

    return { ...this.toPublicShape(product), variants: product.variants, reviews: product.reviews, avgRating };
  }

  /** Ne renvoie jamais costPrice/reservedStock au Front — marge = donnée interne. */
  private toPublicShape<T extends { costPrice: unknown; reservedStock: number; stock: number }>(product: T) {
    const { costPrice: _costPrice, reservedStock, stock, ...rest } = product as any;
    return { ...rest, stock, available: Math.max(0, stock - reservedStock) };
  }

  // ------------------------------------------------------------------
  // Back-Office
  // ------------------------------------------------------------------

  async listForAdmin(query: { category?: string; status?: string; lowStock?: boolean }) {
    const items = await this.prisma.product.findMany({
      where: { categoryId: query.category, status: query.status as never },
      include: { brand: true, category: true, images: { take: 1 } },
      orderBy: { updatedAt: "desc" },
    });
    return query.lowStock ? items.filter((p) => p.stock <= p.alertThreshold) : items;
  }

  /** Contrairement à findBySlug (public), n'importe quel statut est renvoyé — nécessaire pour éditer un brouillon. */
  async findByIdForAdmin(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { brand: true, category: true, images: { orderBy: { order: "asc" } }, variants: true },
    });
    if (!product) throw new NotFoundException("Produit introuvable");
    return product;
  }

  /** Import Excel produits en masse — upsert par SKU, une ligne = un produit. */
  async importFromExcel(buffer: Buffer): Promise<{ results: ImportRowResult[]; created: number; updated: number; errors: number }> {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<ImportRow>(sheet, { defval: undefined });

    const [categories, brands] = await Promise.all([
      this.prisma.category.findMany({ select: { id: true, slug: true } }),
      this.prisma.brand.findMany({ select: { id: true, name: true } }),
    ]);
    const categoryBySlug = new Map(categories.map((c) => [c.slug, c.id]));
    const brandByName = new Map(brands.map((b) => [b.name.toLowerCase(), b.id]));

    const results: ImportRowResult[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // +1 pour l'en-tête, +1 pour l'index 1-based
      const sku = String(row.SKU ?? "").trim();

      try {
        if (!sku) throw new Error("SKU manquant");
        const nameFr = String(row.Nom ?? "").trim();
        if (!nameFr) throw new Error("Nom manquant");
        const categorySlug = String(row["Catégorie"] ?? "").trim();
        const categoryId = categoryBySlug.get(categorySlug);
        if (!categoryId) throw new Error(`Catégorie "${categorySlug}" introuvable`);
        const price = Number(row.Prix);
        if (!Number.isFinite(price) || price < 0) throw new Error("Prix invalide");
        const costPrice = Number(row["Prix de revient"]);
        if (!Number.isFinite(costPrice) || costPrice < 0) throw new Error("Prix de revient invalide");
        const seoUrl = String(row["URL SEO"] ?? "").trim();
        if (!seoUrl) throw new Error("URL SEO manquante");

        const brandName = row.Marque ? String(row.Marque).trim() : undefined;
        const brandId = brandName ? brandByName.get(brandName.toLowerCase()) : undefined;
        if (brandName && !brandId) throw new Error(`Marque "${brandName}" introuvable`);

        const stock = row.Stock !== undefined ? Number(row.Stock) : undefined;
        const ageMin = row["Âge min"] !== undefined ? Number(row["Âge min"]) : undefined;
        const ageMax = row["Âge max"] !== undefined ? Number(row["Âge max"]) : undefined;
        const status = row.Statut ? String(row.Statut).trim().toUpperCase() : undefined;
        if (status && !["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"].includes(status)) {
          throw new Error(`Statut "${status}" invalide`);
        }

        const data = {
          sku,
          nameFr,
          categoryId,
          brandId,
          price,
          costPrice,
          seoUrl,
          stock,
          ageMin,
          ageMax,
          status: status as UpsertProductDto["status"],
        };

        const existing = await this.prisma.product.findUnique({ where: { sku } });
        if (existing) {
          await this.prisma.product.update({ where: { id: existing.id }, data });
          results.push({ row: rowNumber, sku, status: "updated" });
        } else {
          await this.prisma.product.create({ data });
          results.push({ row: rowNumber, sku, status: "created" });
        }
      } catch (err) {
        results.push({ row: rowNumber, sku: sku || "?", status: "error", message: err instanceof Error ? err.message : "Erreur inconnue" });
      }
    }

    return {
      results,
      created: results.filter((r) => r.status === "created").length,
      updated: results.filter((r) => r.status === "updated").length,
      errors: results.filter((r) => r.status === "error").length,
    };
  }

  async create(dto: UpsertProductDto) {
    return this.prisma.product.create({ data: dto });
  }

  async update(id: string, dto: UpsertProductDto, staffUserId: string) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Produit introuvable");

    const updated = await this.prisma.product.update({ where: { id }, data: dto });

    // §183 — toute modification de prix doit être auditée avec ancienne/nouvelle valeur.
    if (Number(existing.price) !== Number(dto.price)) {
      await this.prisma.auditLog.create({
        data: {
          staffUserId,
          action: "product.price.update",
          entity: "Product",
          entityId: id,
          oldValue: { price: existing.price },
          newValue: { price: dto.price },
        },
      });
    }
    return updated;
  }

  async archive(id: string) {
    const found = await this.prisma.product.findUnique({ where: { id } });
    if (!found) throw new NotFoundException("Produit introuvable");
    return this.prisma.product.update({ where: { id }, data: { status: "ARCHIVED" } });
  }

  async adjustStock(productId: string, dto: AdjustStockDto, staffUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      if (dto.variantId) {
        const [variant] = await tx.$queryRaw<{ id: string; stock: number }[]>`
          SELECT id, stock FROM "ProductVariant" WHERE id = ${dto.variantId} FOR UPDATE`;
        if (!variant) throw new NotFoundException("Variante introuvable");
        const newStock = variant.stock + dto.delta;
        if (newStock < 0) throw new BadRequestException("Le stock ne peut jamais devenir négatif");
        await tx.productVariant.update({ where: { id: dto.variantId }, data: { stock: newStock } });
        await tx.stockMovement.create({
          data: {
            productId,
            variantId: dto.variantId,
            previousStock: variant.stock,
            newStock,
            reason: dto.reason,
            staffUserId,
          },
        });
        return { stock: newStock };
      }

      const [product] = await tx.$queryRaw<{ id: string; stock: number }[]>`
        SELECT id, stock FROM "Product" WHERE id = ${productId} FOR UPDATE`;
      if (!product) throw new NotFoundException("Produit introuvable");
      const newStock = product.stock + dto.delta;
      if (newStock < 0) throw new BadRequestException("Le stock ne peut jamais devenir négatif");
      await tx.product.update({ where: { id: productId }, data: { stock: newStock } });
      await tx.stockMovement.create({
        data: { productId, previousStock: product.stock, newStock, reason: dto.reason, staffUserId },
      });
      return { stock: newStock };
    });
  }

  // ------------------------------------------------------------------
  // Réservation de stock — appelée par le module Commandes dans la MÊME
  // transaction que la création de commande, avec verrou de ligne (R3) pour
  // empêcher deux clients de réserver le dernier exemplaire simultanément.
  // ------------------------------------------------------------------

  async reserveStock(tx: Tx, lines: StockLine[]): Promise<void> {
    for (const line of lines) {
      if (line.variantId) {
        const [row] = await tx.$queryRaw<{ stock: number; reservedStock: number }[]>`
          SELECT stock, "reservedStock" FROM "ProductVariant" WHERE id = ${line.variantId} FOR UPDATE`;
        if (!row || row.stock - row.reservedStock < line.quantity) {
          throw new BadRequestException("Stock insuffisant pour un des articles du panier");
        }
        await tx.productVariant.update({
          where: { id: line.variantId },
          data: { reservedStock: { increment: line.quantity } },
        });
      } else {
        const [row] = await tx.$queryRaw<{ stock: number; reservedStock: number }[]>`
          SELECT stock, "reservedStock" FROM "Product" WHERE id = ${line.productId} FOR UPDATE`;
        if (!row || row.stock - row.reservedStock < line.quantity) {
          throw new BadRequestException("Stock insuffisant pour un des articles du panier");
        }
        await tx.product.update({
          where: { id: line.productId },
          data: { reservedStock: { increment: line.quantity } },
        });
      }
    }
  }

  /** Annulation de commande (§74, §193) : le stock réservé est réinjecté automatiquement. */
  async releaseReservation(tx: Tx, lines: StockLine[]): Promise<void> {
    for (const line of lines) {
      if (line.variantId) {
        await tx.productVariant.update({
          where: { id: line.variantId },
          data: { reservedStock: { decrement: line.quantity } },
        });
      } else {
        await tx.product.update({
          where: { id: line.productId },
          data: { reservedStock: { decrement: line.quantity } },
        });
      }
    }
  }

  /** Commande livrée (§194) : le stock physique est décrémenté définitivement. */
  async deductOnDelivery(tx: Tx, lines: StockLine[]): Promise<void> {
    for (const line of lines) {
      if (line.variantId) {
        await tx.productVariant.update({
          where: { id: line.variantId },
          data: { stock: { decrement: line.quantity }, reservedStock: { decrement: line.quantity } },
        });
      } else {
        await tx.product.update({
          where: { id: line.productId },
          data: { stock: { decrement: line.quantity }, reservedStock: { decrement: line.quantity } },
        });
      }
    }
  }
}
