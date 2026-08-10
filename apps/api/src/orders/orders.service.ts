import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ProductsService, type StockLine } from "../catalog/products/products.service";
import { SettingsService } from "../settings/settings.service";
import { EmailService } from "../email/email.service";
import { PricingService, type ActivePromotions } from "../catalog/pricing/pricing.service";
import { calculateCouponDiscount } from "../marketing/coupons/coupon-discount.util";
import { calculateLoyaltyRedemption, calculateVat } from "./order-pricing.util";
import { ORDER_NEXT_STATUS, ORDER_NUMBER_PREFIX } from "@universenfants/shared";
import type { CheckoutDto } from "./dto/checkout.dto";
import type { UpdateOrderStatusDto } from "./dto/update-order-status.dto";

// §74 : l'annulation n'est autorisée qu'avant expédition.
const CANCELLABLE_STATUSES = new Set(["PENDING", "CONFIRMED", "PREPARING"]);

// Les valeurs par défaut de Prisma (maxWait 2s, timeout 5s) suffisent en
// usage normal, mais checkout()/updateStatus() tiennent désormais des
// verrous SELECT ... FOR UPDATE (panier, stock, coupon, points fidélité) —
// sous forte contention sur un même produit (promotion, pic de trafic), la
// file d'attente pour ces verrous peut dépasser 5s sans qu'aucune requête ne
// soit réellement bloquée à tort. Généreux mais borné : un vrai blocage
// (deadlock, bug) échoue toujours, juste plus tard qu'avec les valeurs par
// défaut.
const HIGH_CONTENTION_TX_OPTIONS = { maxWait: 5_000, timeout: 10_000 };

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly products: ProductsService,
    private readonly settings: SettingsService,
    private readonly email: EmailService,
    private readonly pricing: PricingService,
  ) {}

  /** Même règle que cart.service.ts#resolveLineUnitPrice : la variante (si
   * sélectionnée) a toujours son propre prix, sinon moteur de prix centralisé. */
  private resolveLineUnitPrice(
    line: { variant: { price: unknown } | null; product: { price: unknown; promoPrice: unknown; categoryId: string; brandId: string | null } },
    active: ActivePromotions,
  ): number {
    if (line.variant?.price != null) return Number(line.variant.price);
    return this.pricing.resolveForProduct(line.product, active).price;
  }

  async checkout(cartId: string, dto: CheckoutDto) {
    const { vatRate, loyaltyRedeemRate, freeShippingThreshold } = await this.settings.get();

    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: { lines: { include: { product: true, variant: true } } },
    });
    if (!cart || cart.lines.length === 0) throw new BadRequestException("Le panier est vide");

    // §65 / §239 / §240 : une commande invitée crée automatiquement une fiche
    // client, rattachée automatiquement si l'email/téléphone existe déjà.
    const customer = await this.resolveCustomer(cart.customerId, dto);

    const shipping = await this.resolveShippingFee(dto.city, freeShippingThreshold);

    const activePromotions = await this.pricing.getActivePromotions();
    const lines = cart.lines.map((l) => ({
      productId: l.productId,
      variantId: l.variantId,
      quantity: l.quantity,
      nameSnapshot: l.product.nameFr,
      skuSnapshot: l.variant?.sku ?? l.product.sku,
      costPriceSnapshot: Number(l.variant?.costPrice ?? l.product.costPrice),
      sellPriceSnapshot: this.resolveLineUnitPrice(l, activePromotions),
    }));
    const subtotal = lines.reduce((s, l) => s + l.sellPriceSnapshot * l.quantity, 0);

    // §236 : livraison offerte dès le seuil de la ville (ou la règle globale
    // paramétrable) — jusqu'ici calculé mais jamais appliqué au frais réel.
    if (subtotal >= shipping.freeFrom) shipping.fee = 0;

    let couponDiscount = 0;
    const rawCoupon = cart.couponCode ? await this.prisma.coupon.findUnique({ where: { code: cart.couponCode } }) : null;
    // cart.service.ts#applyCoupon valide statut/dates/montant minimum au
    // moment où le coupon est attaché au panier, mais rien ne les
    // re-vérifie ensuite — un coupon peut expirer, être désactivé par un
    // admin, ou le panier peut passer sous le montant minimum (article
    // retiré) entre l'application et le checkout, potentiellement bien plus
    // tard. Sans cette re-validation, le checkout applique une remise qui
    // n'est plus valide au moment de l'achat.
    const now = new Date();
    const coupon =
      rawCoupon &&
      rawCoupon.status === "ACTIVE" &&
      rawCoupon.startAt <= now &&
      rawCoupon.endAt >= now &&
      subtotal >= Number(rawCoupon.minCartAmount)
        ? rawCoupon
        : null;
    if (rawCoupon && !coupon) {
      throw new BadRequestException("Ce coupon n'est plus valide, merci de le retirer du panier");
    }
    if (coupon) {
      const redemptions = await this.prisma.couponRedemption.count({
        where: { couponId: coupon.id, customerId: customer.id },
      });
      if (redemptions >= coupon.maxUsesPerCustomer) {
        throw new BadRequestException("Ce coupon a déjà été utilisé");
      }
      couponDiscount = calculateCouponDiscount(subtotal, coupon);
      if (coupon.type === "FREE_SHIPPING") shipping.fee = 0;
    }

    // §219 : les points sont calculés sur le montant produits uniquement,
    // hors livraison et coupons — donc l'application des points se fait
    // après la remise coupon mais sur le sous-total, pas sur le total livré.
    let loyaltyDiscount = 0;
    let pointsToRedeem = 0;
    if (dto.useLoyaltyPoints) {
      const account = await this.prisma.loyaltyAccount.findUnique({ where: { customerId: customer.id } });
      if (account && account.pointsBalance > 0) {
        ({ loyaltyDiscount, pointsToRedeem } = calculateLoyaltyRedemption(
          subtotal,
          couponDiscount,
          account.pointsBalance,
          loyaltyRedeemRate,
        ));
      }
    }

    const total = Math.max(0, subtotal - couponDiscount - loyaltyDiscount + shipping.fee);
    const vatAmount = calculateVat(total, vatRate);

    const stockLines: StockLine[] = lines.map((l) => ({
      productId: l.productId,
      variantId: l.variantId,
      quantity: l.quantity,
    }));

    const order = await this.prisma.$transaction(async (tx) => {
      // Verrou + re-vérification : sans ça, un double-clic ou un retry après
      // timeout côté client peut faire passer deux checkout() concurrents sur
      // le même panier avant qu'aucun n'ait mis à jour son statut, créant
      // deux commandes distinctes pour un seul panier.
      const [lockedCart] = await tx.$queryRaw<{ status: string }[]>`
        SELECT status FROM "Cart" WHERE id = ${cart.id} FOR UPDATE`;
      if (!lockedCart || lockedCart.status !== "ACTIVE") {
        throw new BadRequestException("Ce panier a déjà été validé");
      }

      // R3 : verrou de ligne pour empêcher la survente en cas de commandes simultanées.
      await this.products.reserveStock(tx, stockLines);

      // Re-vérification sous verrou : la validation faite plus haut (avant la
      // transaction) est une réponse rapide pour l'UX, mais ne protège pas
      // contre deux checkout() concurrents épuisant chacun une limite de
      // coupon avant qu'aucun des deux n'ait committé.
      if (coupon) {
        const [lockedCoupon] = await tx.$queryRaw<{ usedCount: number; maxUses: number | null }[]>`
          SELECT "usedCount", "maxUses" FROM "Coupon" WHERE id = ${coupon.id} FOR UPDATE`;
        if (!lockedCoupon || (lockedCoupon.maxUses !== null && lockedCoupon.usedCount >= lockedCoupon.maxUses)) {
          throw new BadRequestException("Ce coupon a atteint sa limite d'utilisation");
        }
        const redemptions = await tx.couponRedemption.count({
          where: { couponId: coupon.id, customerId: customer.id },
        });
        if (redemptions >= coupon.maxUsesPerCustomer) {
          throw new BadRequestException("Ce coupon a déjà été utilisé");
        }
      }

      const orderNumber = await this.nextOrderNumber(tx);

      const created = await tx.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          subtotal,
          shippingFee: shipping.fee,
          discount: couponDiscount,
          loyaltyDiscount,
          vatRate,
          vatAmount,
          total,
          shippingCity: dto.city,
          shippingAddress: dto.addressLine,
          shippingPhone: dto.phone,
          shippingRuleLabel: shipping.label,
          couponId: coupon?.id,
          lines: {
            create: lines.map((l) => ({
              productId: l.productId,
              variantId: l.variantId,
              productNameSnapshot: l.nameSnapshot,
              skuSnapshot: l.skuSnapshot,
              costPriceSnapshot: l.costPriceSnapshot,
              sellPriceSnapshot: l.sellPriceSnapshot,
              quantity: l.quantity,
              lineTotal: l.sellPriceSnapshot * l.quantity,
            })),
          },
          statusHistory: { create: { toStatus: "PENDING" } },
        },
        include: { lines: true },
      });

      if (coupon) {
        await tx.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });
        await tx.couponRedemption.create({
          data: { couponId: coupon.id, orderId: created.id, customerId: customer.id },
        });
      }

      if (pointsToRedeem > 0) {
        // Verrou + re-vérification : même faille que les coupons — sans ça,
        // deux checkouts concurrents du même client (deux onglets, deux
        // appareils) utilisant chacun des points fidélité liraient le même
        // solde de départ avant qu'aucun n'ait committé, et le solde final
        // pourrait devenir négatif (decrement atomique côté SQL, mais sans
        // jamais vérifier qu'il reste suffisamment de points à ce moment-là).
        const [lockedAccount] = await tx.$queryRaw<{ id: string; pointsBalance: number }[]>`
          SELECT id, "pointsBalance" FROM "LoyaltyAccount" WHERE "customerId" = ${customer.id} FOR UPDATE`;
        if (!lockedAccount || lockedAccount.pointsBalance < pointsToRedeem) {
          throw new BadRequestException("Solde de points fidélité insuffisant, merci de réessayer");
        }
        await tx.loyaltyAccount.update({
          where: { id: lockedAccount.id },
          data: { pointsBalance: { decrement: pointsToRedeem } },
        });
        await tx.loyaltyTransaction.create({
          data: { accountId: lockedAccount.id, type: "REDEEM", points: -pointsToRedeem, orderId: created.id },
        });
      }

      await tx.customer.update({
        where: { id: customer.id },
        data: {
          ordersCount: { increment: 1 },
          totalSpent: { increment: total },
          lastOrderAt: new Date(),
          firstOrderAt: customer.firstOrderAt ?? new Date(),
        },
      });

      await tx.cart.update({ where: { id: cart.id }, data: { status: "CONVERTED" } });

      return created;
    }, HIGH_CONTENTION_TX_OPTIONS);

    if (customer.email) {
      void this.email.sendOrderConfirmed(
        customer.email,
        order.orderNumber,
        order.lines.map((l) => ({ name: l.productNameSnapshot, quantity: l.quantity, lineTotal: Number(l.lineTotal) })),
        Number(order.total),
      );
    }
    return this.sanitizeForCustomer(order);
  }

  private async resolveCustomer(
    existingCustomerId: string | null,
    dto: Pick<CheckoutDto, "firstName" | "lastName" | "phone" | "email">,
  ) {
    if (existingCustomerId) {
      const existing = await this.prisma.customer.findUnique({ where: { id: existingCustomerId } });
      if (existing) return existing;
    }
    // Le téléphone seul n'est jamais une preuve d'identité : un checkout
    // invité ne rattache automatiquement la commande à un compte existant
    // (§65/§240) que sur correspondance EXACTE d'email — jamais sur le seul
    // téléphone, trivialement connu/deviné pour un tiers (colis, partage,
    // liste de contacts) contrairement à un email exact.
    const found = dto.email ? await this.prisma.customer.findUnique({ where: { email: dto.email } }) : null;
    if (found) return found;

    try {
      const created = await this.prisma.customer.create({
        data: { firstName: dto.firstName, lastName: dto.lastName, email: dto.email, phone: dto.phone },
      });
      await this.prisma.loyaltyAccount.create({ data: { customerId: created.id } });
      await this.prisma.wishlist.create({ data: { customerId: created.id } });
      return created;
    } catch (err) {
      if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2002") throw err;

      const target = err.meta?.target;
      const conflictFields = Array.isArray(target) ? target : typeof target === "string" ? [target] : [];

      if (dto.email && conflictFields.includes("email")) {
        // Deux checkouts invités concurrents avec le même email (deux
        // onglets, retry réseau) ont tous deux vu "aucun client trouvé"
        // avant qu'aucun n'ait committé — le second create() percute la
        // contrainte unique. Même email = même preuve d'identité : on relit
        // le client que l'autre requête vient de créer et on s'y rattache.
        const winner = await this.prisma.customer.findUnique({ where: { email: dto.email } });
        if (winner) return winner;
      }

      if (conflictFields.includes("phone")) {
        // Le téléphone appartient déjà à un AUTRE client (ou une requête
        // invité concurrente au même numéro) — comme il ne prouve rien à lui
        // seul, on ne rattache jamais cette commande à ce compte tiers : la
        // fiche cliente de CETTE commande est créée sans le téléphone en
        // conflit. Le numéro réel reste capturé sur la commande elle-même
        // (Order.shippingPhone), donc rien n'est perdu pour la livraison.
        const createdWithoutPhone = await this.prisma.customer.create({
          data: { firstName: dto.firstName, lastName: dto.lastName, email: dto.email },
        });
        await this.prisma.loyaltyAccount.create({ data: { customerId: createdWithoutPhone.id } });
        await this.prisma.wishlist.create({ data: { customerId: createdWithoutPhone.id } });
        return createdWithoutPhone;
      }

      throw err;
    }
  }

  /** I7 : la règle ville prime toujours sur la règle globale ; la règle
   * globale ne s'applique qu'aux villes sans seuil spécifique. */
  private async resolveShippingFee(cityName: string, globalFreeShippingThreshold: number) {
    const city = await this.prisma.city.findUnique({ where: { name: cityName }, include: { group: true } });
    if (!city || !city.active) throw new BadRequestException("Ville de livraison non desservie");
    const freeFrom = city.freeShippingFrom ?? city.group?.freeShippingFrom ?? globalFreeShippingThreshold;
    return { fee: Number(city.shippingFee), freeFrom: Number(freeFrom), label: `${city.name} — figé à la commande` };
  }

  private async nextOrderNumber(tx: Prisma.TransactionClient): Promise<string> {
    const year = new Date().getFullYear();
    const key = `order_seq_${year}`;
    // Compteur verrouillé au niveau ligne pour garantir l'unicité même en
    // cas de commandes concurrentes (même principe que le verrou de stock, R3).
    const [row] = await tx.$queryRaw<{ value: unknown }[]>`
      SELECT value FROM "SystemSetting" WHERE key = ${key} FOR UPDATE`;
    const current = row ? Number((row.value as { n: number }).n) : 0;
    const next = current + 1;
    await tx.systemSetting.upsert({
      where: { key },
      update: { value: { n: next } },
      create: { key, value: { n: next } },
    });
    return `${ORDER_NUMBER_PREFIX}-${year}-${String(next).padStart(6, "0")}`;
  }

  // ------------------------------------------------------------------

  /** costPriceSnapshot = marge interne, ne doit jamais atteindre un client (Front). */
  private sanitizeForCustomer<T extends { lines: { costPriceSnapshot: unknown }[] }>(order: T) {
    return { ...order, lines: order.lines.map(({ costPriceSnapshot: _omit, ...line }) => line) };
  }

  async findForCustomer(customerId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { lines: true, statusHistory: { orderBy: { createdAt: "asc" } } },
    });
    if (!order || order.customerId !== customerId) throw new NotFoundException("Commande introuvable");
    return this.sanitizeForCustomer(order);
  }

  listForCustomer(customerId: string) {
    return this.prisma.order.findMany({ where: { customerId }, orderBy: { createdAt: "desc" } });
  }

  /** §74 / §193 : le client peut annuler lui-même tant que la commande n'a pas été expédiée. */
  async cancelByCustomer(customerId: string, orderId: string) {
    const order = await this.prisma.$transaction(async (tx) => {
      // Verrou de ligne : sans lui, un double-clic sur "Annuler" peut faire
      // passer deux appels concurrents avant qu'aucun n'ait mis à jour le
      // statut, chacun libérant la réservation de stock — la réservation
      // serait alors décrémentée deux fois pour une seule commande.
      const lockRows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
      if (lockRows.length === 0) throw new NotFoundException("Commande introuvable");

      const order = await tx.order.findUnique({ where: { id: orderId }, include: { lines: true, customer: true } });
      if (!order || order.customerId !== customerId) throw new NotFoundException("Commande introuvable");
      if (!CANCELLABLE_STATUSES.has(order.status)) {
        throw new BadRequestException("Cette commande ne peut plus être annulée (déjà expédiée)");
      }

      const stockLines: StockLine[] = order.lines.map((l) => ({
        productId: l.productId,
        variantId: l.variantId,
        quantity: l.quantity,
      }));

      await this.products.releaseReservation(tx, stockLines);
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          statusHistory: {
            create: { fromStatus: order.status, toStatus: "CANCELLED", note: "Annulée par le client" },
          },
        },
      });

      return order;
    }, HIGH_CONTENTION_TX_OPTIONS);

    if (order.customer.email) void this.email.sendOrderStatusChanged(order.customer.email, order.orderNumber, "CANCELLED");

    return this.findForCustomer(customerId, orderId);
  }

  listForAdmin(filters: { status?: string; city?: string }) {
    return this.prisma.order.findMany({
      where: { status: filters.status as never, shippingCity: filters.city },
      include: { customer: true },
      orderBy: { createdAt: "desc" },
      // Filet de sécurité : évite une réponse illimitée si le volume de
      // commandes grossit fortement ; une vraie pagination Back-Office
      // pourra être ajoutée plus tard sans changer ce plafond.
      take: 1000,
    });
  }

  async findForAdmin(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        lines: true,
        customer: true,
        statusHistory: { include: { staffUser: true }, orderBy: { createdAt: "asc" } },
      },
    });
    if (!order) throw new NotFoundException("Commande introuvable");
    return order;
  }

  async updateStatus(orderId: string, dto: UpdateOrderStatusDto, staffUserId: string) {
    const updated = await this.prisma.$transaction(async (tx) => {
      // Verrou de ligne : sans lui, deux transitions de statut concurrentes
      // sur la même commande (double-clic, deux membres du staff traitant la
      // même commande) peuvent toutes deux lire le même statut de départ et
      // exécuter chacune leurs effets de bord — libération de stock, déduction
      // de stock à la livraison, crédit de points fidélité — donc deux fois.
      const lockRows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
      if (lockRows.length === 0) throw new NotFoundException("Commande introuvable");

      const order = await tx.order.findUnique({ where: { id: orderId }, include: { lines: true, customer: true } });
      if (!order) throw new NotFoundException("Commande introuvable");

      if (dto.status === "CANCELLED" && !CANCELLABLE_STATUSES.has(order.status)) {
        throw new BadRequestException("Cette commande ne peut plus être annulée (déjà expédiée)");
      }
      if (dto.status !== "CANCELLED" && !ORDER_NEXT_STATUS[order.status].includes(dto.status)) {
        throw new BadRequestException(`Transition ${order.status} → ${dto.status} non autorisée`);
      }

      const stockLines: StockLine[] = order.lines.map((l) => ({
        productId: l.productId,
        variantId: l.variantId,
        quantity: l.quantity,
      }));

      if (dto.status === "CANCELLED") {
        await this.products.releaseReservation(tx, stockLines);
      }
      if (dto.status === "DELIVERED") {
        await this.products.deductOnDelivery(tx, stockLines, orderId);
        // §218 : les points de fidélité ne sont crédités qu'à la livraison.
        const account = await tx.loyaltyAccount.findUnique({ where: { customerId: order.customerId } });
        if (account) {
          const base = Number(order.subtotal) - Number(order.discount);
          const earned = Math.floor(base / 10); // 1 point / 10 DH, cf. Paramètres Fidélité
          if (earned > 0) {
            await tx.loyaltyAccount.update({ where: { id: account.id }, data: { pointsBalance: { increment: earned } } });
            await tx.loyaltyTransaction.create({
              data: {
                accountId: account.id,
                type: "EARN",
                points: earned,
                orderId: order.id,
                expiresAt: new Date(Date.now() + 24 * 30 * 24 * 60 * 60 * 1000),
              },
            });
          }
        }
      }

      const timestampField =
        dto.status === "CONFIRMED"
          ? "confirmedAt"
          : dto.status === "SHIPPED"
            ? "shippedAt"
            : dto.status === "DELIVERED"
              ? "deliveredAt"
              : dto.status === "CANCELLED"
                ? "cancelledAt"
                : undefined;

      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          status: dto.status,
          ...(timestampField ? { [timestampField]: new Date() } : {}),
          statusHistory: {
            create: { fromStatus: order.status, toStatus: dto.status, staffUserId, note: dto.note },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          staffUserId,
          action: "order.status.update",
          entity: "Order",
          entityId: orderId,
          oldValue: { status: order.status },
          newValue: { status: dto.status },
        },
      });

      return { updated, customerEmail: order.customer.email, orderNumber: order.orderNumber };
    }, HIGH_CONTENTION_TX_OPTIONS);

    if (updated.customerEmail) {
      void this.email.sendOrderStatusChanged(updated.customerEmail, updated.orderNumber, dto.status);
    }

    return updated.updated;
  }

  /** §11/§12 (module Landing Pages) : commande ultra-rapide sans compte ni
   * panier — toujours enregistrée dans le système de commandes existant
   * (§14 : pas de circuit parallèle), juste avec landingPageId renseigné. */
  async quickOrderFromLandingPage(landingPage: {
    id: string;
    productId: string;
    displayPrice: unknown;
  }, dto: { name: string; phone: string; city: string; quantity?: number; addressLine?: string; variantId?: string }) {
    const { vatRate, freeShippingThreshold } = await this.settings.get();

    const product = await this.prisma.product.findUnique({
      where: { id: landingPage.productId },
      include: { variants: true },
    });
    if (!product || product.status !== "ACTIVE") throw new BadRequestException("Produit indisponible");

    // Le stock est géré au niveau variante quand le produit en a (cf.
    // schema.prisma) — sans ce garde-fou, une commande rapide pour un tel
    // produit décrémentait toujours Product.stock (resté à 0), rejetant à
    // tort toute commande faute de "stock", ou pire, décrémentait le mauvais
    // compteur si Product.stock avait une valeur résiduelle non nulle.
    const variant = dto.variantId ? product.variants.find((v) => v.id === dto.variantId) : null;
    if (product.variants.length > 0 && !variant) {
      throw new BadRequestException("Merci de choisir une option pour ce produit");
    }

    const quantity = dto.quantity ?? 1;
    // landingPage.displayPrice est un prix spécial choisi explicitement par
    // l'admin pour CETTE landing page — il prime toujours sur le moteur de
    // prix centralisé (sans quoi une promotion catalogue non liée à la
    // campagne pourrait silencieusement changer le prix affiché/facturé).
    // Une variante avec son propre prix passe cependant devant le prix
    // catalogue de repli, même logique que cart.service.ts#resolveLineUnitPrice.
    const unitPrice =
      landingPage.displayPrice != null
        ? Number(landingPage.displayPrice)
        : variant?.price != null
          ? Number(variant.price)
          : this.pricing.resolveForProduct(product, await this.pricing.getActivePromotions()).price;
    const subtotal = unitPrice * quantity;

    const customer = await this.resolveCustomer(null, { firstName: dto.name, lastName: "", phone: dto.phone });
    const shipping = await this.resolveShippingFee(dto.city, freeShippingThreshold);
    if (subtotal >= shipping.freeFrom) shipping.fee = 0;

    const total = subtotal + shipping.fee;
    const vatAmount = calculateVat(total, vatRate);

    const stockLines: StockLine[] = [{ productId: product.id, variantId: variant?.id ?? null, quantity }];

    const order = await this.prisma.$transaction(async (tx) => {
      await this.products.reserveStock(tx, stockLines);
      const orderNumber = await this.nextOrderNumber(tx);

      const created = await tx.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          landingPageId: landingPage.id,
          subtotal,
          shippingFee: shipping.fee,
          vatRate,
          vatAmount,
          total,
          shippingCity: dto.city,
          shippingAddress: dto.addressLine ?? "",
          shippingPhone: dto.phone,
          shippingRuleLabel: shipping.label,
          lines: {
            create: {
              productId: product.id,
              variantId: variant?.id,
              productNameSnapshot: product.nameFr,
              skuSnapshot: variant?.sku ?? product.sku,
              costPriceSnapshot: Number(variant?.costPrice ?? product.costPrice),
              sellPriceSnapshot: unitPrice,
              quantity,
              lineTotal: subtotal,
            },
          },
          statusHistory: { create: { toStatus: "PENDING", note: "Commande rapide — Landing Page" } },
        },
        include: { lines: true },
      });

      await tx.customer.update({
        where: { id: customer.id },
        data: {
          ordersCount: { increment: 1 },
          totalSpent: { increment: total },
          lastOrderAt: new Date(),
          firstOrderAt: customer.firstOrderAt ?? new Date(),
        },
      });

      return created;
    }, HIGH_CONTENTION_TX_OPTIONS);

    return { orderNumber: order.orderNumber, total: order.total };
  }

  async recordPayment(orderId: string, amount: number) {
    return this.prisma.$transaction(async (tx) => {
      // Verrou de ligne : deux encaissements concurrents sur la même commande
      // (double-clic, deux opérateurs) ne doivent pas se baser sur la même
      // lecture de paidAmount sous peine d'en perdre un silencieusement.
      const [order] = await tx.$queryRaw<
        { id: string; paidAmount: unknown; total: unknown; paidAt: Date | null }[]
      >`SELECT id, "paidAmount", total, "paidAt" FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
      if (!order) throw new NotFoundException("Commande introuvable");
      const paidAmount = Number(order.paidAmount) + amount;
      if (paidAmount > Number(order.total)) {
        throw new BadRequestException("Le montant encaissé dépasse le total de la commande");
      }
      const paymentStatus = paidAmount >= Number(order.total) ? "PAID" : "PARTIAL";
      return tx.order.update({
        where: { id: orderId },
        data: { paidAmount, paymentStatus, paidAt: paymentStatus === "PAID" ? new Date() : order.paidAt },
      });
    }, HIGH_CONTENTION_TX_OPTIONS);
  }

  async assertCustomerOwnsOrder(customerId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.customerId !== customerId) throw new ForbiddenException("Accès refusé");
    return order;
  }
}
