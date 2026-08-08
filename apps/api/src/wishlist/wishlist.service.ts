import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOrCreate(customerId: string) {
    return this.prisma.wishlist.upsert({
      where: { customerId },
      update: {},
      create: { customerId },
    });
  }

  async list(customerId: string) {
    const wishlist = await this.getOrCreate(customerId);
    const lines = await this.prisma.wishlistLine.findMany({
      where: { wishlistId: wishlist.id, removedAt: null },
      include: { product: { include: { images: { take: 1 } } } },
      orderBy: { addedAt: "desc" },
    });
    return lines.map((l) => ({
      productId: l.productId,
      addedAt: l.addedAt,
      name: l.product.nameFr,
      price: Number(l.product.promoPrice ?? l.product.price),
      image: l.product.images[0]?.url ?? null,
      available: l.product.stock - l.product.reservedStock > 0,
    }));
  }

  async add(customerId: string, productId: string) {
    const wishlist = await this.getOrCreate(customerId);
    const existing = await this.prisma.wishlistLine.findFirst({
      where: { wishlistId: wishlist.id, productId },
    });
    if (existing) {
      if (existing.removedAt) {
        await this.prisma.wishlistLine.update({ where: { id: existing.id }, data: { removedAt: null } });
      }
    } else {
      await this.prisma.wishlistLine.create({ data: { wishlistId: wishlist.id, productId } });
    }
    return this.list(customerId);
  }

  async remove(customerId: string, productId: string) {
    const wishlist = await this.getOrCreate(customerId);
    // Conservé (removedAt) plutôt que supprimé, pour l'analytics wishlist (§210).
    await this.prisma.wishlistLine.updateMany({
      where: { wishlistId: wishlist.id, productId, removedAt: null },
      data: { removedAt: new Date() },
    });
    return this.list(customerId);
  }
}
