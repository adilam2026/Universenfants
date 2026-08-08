import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { nanoid } from "nanoid";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateBirthdayListDto } from "./dto/birthday-list.dto";

@Injectable()
export class BirthdayListService {
  constructor(private readonly prisma: PrismaService) {}

  async create(customerId: string, dto: CreateBirthdayListDto) {
    return this.prisma.birthdayList.create({
      data: {
        customerId,
        childName: dto.childName,
        eventDate: new Date(dto.eventDate),
        message: dto.message,
        shareToken: nanoid(12),
      },
      include: { items: { include: { product: { include: { images: { take: 1 } } } } } },
    });
  }

  async listMine(customerId: string) {
    return this.prisma.birthdayList.findMany({
      where: { customerId },
      include: { items: { include: { product: { include: { images: { take: 1 } } } } } },
      orderBy: { createdAt: "desc" },
    });
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
    await this.prisma.birthdayListItem.delete({ where: { id: itemId } });
    return this.listMine(customerId);
  }

  /** §232 : la fiche publique ne doit jamais révéler qui a réservé un cadeau. */
  async getShared(shareToken: string) {
    const list = await this.prisma.birthdayList.findUnique({
      where: { shareToken },
      include: { items: { include: { product: { include: { images: { take: 1 } } } } } },
    });
    if (!list || list.status !== "ACTIVE") throw new NotFoundException("Liste introuvable ou expirée");
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
          promoPrice: i.product.promoPrice,
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
