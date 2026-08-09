import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { nanoid } from "nanoid";
import { PrismaService } from "../prisma/prisma.service";
import { PricingService, type ActivePromotions } from "../catalog/pricing/pricing.service";
import type { CreateBirthdayListDto } from "./dto/birthday-list.dto";

/** costPrice/reservedStock = données internes, jamais exposées au Front.
 * categoryId/brandId sont nécessaires au moteur de prix centralisé
 * (resolveForProduct) mais jamais renvoyés tels quels au Front. */
const PRODUCT_ITEM_INCLUDE = {
  product: {
    select: {
      id: true,
      nameFr: true,
      nameAr: true,
      seoUrl: true,
      price: true,
      promoPrice: true,
      categoryId: true,
      brandId: true,
      stock: true,
      images: { take: 1 },
    },
  },
} as const;

@Injectable()
export class BirthdayListService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
  ) {}

  /** Le prix affiché doit passer par le moteur de prix centralisé (comme
   * partout ailleurs) plutôt que par le seul product.promoPrice, sans quoi
   * les promotions catégorie/marque/boutique actives seraient ignorées. */
  private resolveItemPrices<
    I extends { product: { price: unknown; promoPrice: unknown; categoryId: string; brandId: string | null } },
  >(items: I[], active: ActivePromotions): I[] {
    return items.map((item) => ({
      ...item,
      product: { ...item.product, promoPrice: this.resolvedPromoPrice(item.product, active) },
    }));
  }

  private resolvedPromoPrice(
    product: { price: unknown; promoPrice: unknown; categoryId: string; brandId: string | null },
    active: ActivePromotions,
  ) {
    const result = this.pricing.resolveForProduct(product, active);
    return result.compareAtPrice !== null ? result.price : null;
  }

  async create(customerId: string, dto: CreateBirthdayListDto) {
    const created = await this.prisma.birthdayList.create({
      data: {
        customerId,
        childName: dto.childName,
        eventDate: new Date(dto.eventDate),
        message: dto.message,
        shareToken: nanoid(12),
      },
      include: { items: { include: PRODUCT_ITEM_INCLUDE } },
    });
    const active = await this.pricing.getActivePromotions();
    return { ...created, items: this.resolveItemPrices(created.items, active) };
  }

  async listMine(customerId: string) {
    const lists = await this.prisma.birthdayList.findMany({
      where: { customerId },
      include: { items: { include: PRODUCT_ITEM_INCLUDE } },
      orderBy: { createdAt: "desc" },
    });
    const active = await this.pricing.getActivePromotions();
    return lists.map((list) => ({ ...list, items: this.resolveItemPrices(list.items, active) }));
  }

  private async assertOwnership(customerId: string, listId: string) {
    const list = await this.prisma.birthdayList.findUnique({ where: { id: listId } });
    if (!list || list.customerId !== customerId) throw new ForbiddenException("Accès refusé");
    return list;
  }

  async addItem(customerId: string, listId: string, productId: string) {
    await this.assertOwnership(customerId, listId);
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.status !== "ACTIVE") throw new NotFoundException("Produit introuvable");
    await this.prisma.birthdayListItem.create({ data: { listId, productId } });
    return this.listMine(customerId);
  }

  async removeItem(customerId: string, listId: string, itemId: string) {
    await this.assertOwnership(customerId, listId);
    // assertOwnership ne vérifie que la propriété de la LISTE — sans borner
    // la suppression à listId, un client possédant sa propre liste pouvait
    // supprimer l'item d'une liste appartenant à un autre client en devinant
    // simplement son itemId (IDOR : mauvaise ressource vérifiée).
    const { count } = await this.prisma.birthdayListItem.deleteMany({ where: { id: itemId, listId } });
    if (count === 0) throw new NotFoundException("Cadeau introuvable dans cette liste");
    return this.listMine(customerId);
  }

  /** §232 : la fiche publique ne doit jamais révéler qui a réservé un cadeau. */
  async getShared(shareToken: string) {
    const list = await this.prisma.birthdayList.findUnique({
      where: { shareToken },
      include: { items: { include: { product: { include: { images: { take: 1 } } } } } },
    });
    if (!list || list.status !== "ACTIVE") throw new NotFoundException("Liste introuvable ou expirée");
    const active = await this.pricing.getActivePromotions();
    return {
      id: list.id,
      childName: list.childName,
      eventDate: list.eventDate,
      message: list.message,
      items: list.items.map((i) => ({
        id: i.id,
        reserved: i.reserved,
        product: {
          id: i.product.id,
          nameFr: i.product.nameFr,
          nameAr: i.product.nameAr,
          seoUrl: i.product.seoUrl,
          price: i.product.price,
          promoPrice: this.resolvedPromoPrice(i.product, active),
          image: i.product.images[0]?.url ?? null,
        },
      })),
    };
  }

  async reserveItem(shareToken: string, itemId: string, reserverToken: string) {
    const list = await this.prisma.birthdayList.findUnique({ where: { shareToken } });
    if (!list || list.status !== "ACTIVE") throw new NotFoundException("Liste introuvable ou expirée");

    // updateMany + condition reserved:false rend la réservation atomique :
    // deux invités cliquant en même temps ne peuvent pas réserver le même cadeau (§232).
    const { count } = await this.prisma.birthdayListItem.updateMany({
      where: { id: itemId, listId: list.id, reserved: false },
      data: { reserved: true, reservedByToken: reserverToken, reservedAt: new Date() },
    });
    if (count === 0) {
      const exists = await this.prisma.birthdayListItem.findFirst({ where: { id: itemId, listId: list.id } });
      throw exists ? new BadRequestException("Ce cadeau est déjà réservé") : new NotFoundException("Cadeau introuvable");
    }
    return this.getShared(shareToken);
  }
}
