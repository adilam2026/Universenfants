import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { nanoid } from "nanoid";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { DEFAULT_SHARED_CART_EXPIRY_DAYS } from "@universenfants/shared";
import { calculateCouponDiscount } from "../marketing/coupons/coupon-discount.util";
import type { AddCartLineDto, UpdateCartLineDto } from "./dto/cart.dto";

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  /** Résout (ou crée) le panier actif pour ce token — lien collaboratif prioritaire (§149). */
  async resolveCart(ownerToken: string, customerId?: string | null, shareToken?: string) {
    if (shareToken) {
      const shared = await this.prisma.cart.findUnique({ where: { shareToken } });
      if (!shared || shared.status !== "ACTIVE") throw new NotFoundException("Panier partagé introuvable ou expiré");
      return shared;
    }

    let cart = await this.prisma.cart.findUnique({ where: { ownerToken } });
    if (!cart) {
      // Le token panier est généré et persisté en localStorage de façon
      // synchrone dès le premier accès (cart-client.ts#getCartToken), avant
      // le moindre appel réseau — plusieurs requêtes déclenchées en parallèle
      // à la toute première visite (icône panier, page panier, etc.)
      // partagent donc le même token tout neuf. Sans ce filet, la seconde
      // percute la contrainte unique sur ownerToken et plante avec un 500.
      try {
        cart = await this.prisma.cart.create({ data: { ownerToken, customerId: customerId ?? undefined } });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
          cart = await this.prisma.cart.findUniqueOrThrow({ where: { ownerToken } });
        } else {
          throw err;
        }
      }
    } else if (cart.status !== "ACTIVE") {
      // Panier déjà commandé/expiré : on repart d'un panier vierge sur le même token.
      await this.prisma.cartLine.deleteMany({ where: { cartId: cart.id } });
      cart = await this.prisma.cart.update({
        where: { id: cart.id },
        data: { status: "ACTIVE", couponCode: null, shareToken: null, customerId: customerId ?? cart.customerId },
      });
    } else if (customerId && !cart.customerId) {
      // Rattachement automatique dès qu'un visiteur invité se connecte.
      cart = await this.prisma.cart.update({ where: { id: cart.id }, data: { customerId } });
    }
    return cart;
  }

  async getFullCart(cartId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        lines: { include: { product: { include: { images: { take: 1 } } }, variant: true } },
        participants: true,
      },
    });
    if (!cart) throw new NotFoundException("Panier introuvable");

    let coupon = null as Awaited<ReturnType<typeof this.prisma.coupon.findUnique>> | null;
    if (cart.couponCode) {
      coupon = await this.prisma.coupon.findUnique({ where: { code: cart.couponCode } });
    }

    const subtotal = cart.lines.reduce((sum, line) => {
      const unitPrice = Number(line.variant?.price ?? line.product.promoPrice ?? line.product.price);
      return sum + unitPrice * line.quantity;
    }, 0);

    const discount = calculateCouponDiscount(subtotal, coupon);

    return {
      id: cart.id,
      shareToken: cart.shareToken,
      participants: cart.participants,
      lines: cart.lines.map((l) => ({
        id: l.id,
        productId: l.productId,
        variantId: l.variantId,
        quantity: l.quantity,
        name: l.product.nameFr,
        image: l.product.images[0]?.url ?? null,
        unitPrice: Number(l.variant?.price ?? l.product.promoPrice ?? l.product.price),
        variantLabel: l.variant?.label ?? null,
      })),
      couponCode: cart.couponCode,
      subtotal,
      discount,
      total: Math.max(0, subtotal - discount),
    };
  }

  async addLine(cartId: string, dto: AddCartLineDto) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product || product.status !== "ACTIVE") throw new NotFoundException("Produit introuvable");

    const existing = await this.prisma.cartLine.findFirst({
      where: { cartId, productId: dto.productId, variantId: dto.variantId ?? null },
    });
    if (existing) {
      return this.prisma.cartLine.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + (dto.quantity ?? 1) },
      });
    }
    return this.prisma.cartLine.create({
      data: {
        cartId,
        productId: dto.productId,
        variantId: dto.variantId,
        quantity: dto.quantity ?? 1,
      },
    });
  }

  async updateLine(cartId: string, lineId: string, dto: UpdateCartLineDto) {
    const line = await this.prisma.cartLine.findFirst({ where: { id: lineId, cartId } });
    if (!line) throw new NotFoundException("Ligne de panier introuvable");
    return this.prisma.cartLine.update({ where: { id: lineId }, data: { quantity: dto.quantity } });
  }

  async removeLine(cartId: string, lineId: string) {
    const line = await this.prisma.cartLine.findFirst({ where: { id: lineId, cartId } });
    if (!line) throw new NotFoundException("Ligne de panier introuvable");
    await this.prisma.cartLine.delete({ where: { id: lineId } });
    return { ok: true };
  }

  async applyCoupon(cartId: string, code: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    const now = new Date();
    if (
      !coupon ||
      coupon.status !== "ACTIVE" ||
      coupon.startAt > now ||
      coupon.endAt < now ||
      (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses)
    ) {
      throw new BadRequestException("Code promotionnel invalide ou expiré");
    }
    const full = await this.getFullCart(cartId);
    if (full.subtotal < Number(coupon.minCartAmount)) {
      throw new BadRequestException(`Montant minimum du panier non atteint (${coupon.minCartAmount} DH)`);
    }
    await this.prisma.cart.update({ where: { id: cartId }, data: { couponCode: coupon.code } });
    return this.getFullCart(cartId);
  }

  async removeCoupon(cartId: string) {
    await this.prisma.cart.update({ where: { id: cartId }, data: { couponCode: null } });
    return this.getFullCart(cartId);
  }

  /** Génère un lien de partage pour le panier collaboratif (§211, §212). */
  async share(cartId: string) {
    const cart = await this.prisma.cart.findUniqueOrThrow({ where: { id: cartId } });
    const shareToken = cart.shareToken ?? nanoid(12);
    const expiresAt = new Date(Date.now() + DEFAULT_SHARED_CART_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    await this.prisma.cart.update({ where: { id: cartId }, data: { shareToken, expiresAt } });
    return { shareToken };
  }

  async joinShared(shareToken: string, email: string) {
    const cart = await this.prisma.cart.findUnique({ where: { shareToken } });
    if (!cart || cart.status !== "ACTIVE") throw new NotFoundException("Panier partagé introuvable ou expiré");

    const existing = await this.prisma.cartParticipant.findFirst({ where: { cartId: cart.id, email } });
    if (existing) {
      await this.prisma.cartParticipant.update({ where: { id: existing.id }, data: { lastSeenAt: new Date() } });
    } else {
      await this.prisma.cartParticipant.create({ data: { cartId: cart.id, email } });
    }
    return this.getFullCart(cart.id);
  }
}
