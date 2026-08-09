import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { OrdersService } from "../orders/orders.service";
import { PricingService } from "../catalog/pricing/pricing.service";
import { runCatchingDuplicate } from "../common/prisma-errors.util";
import type { UpsertLandingPageDto } from "./dto/upsert-landing-page.dto";
import type { QuickOrderDto } from "./dto/quick-order.dto";

@Injectable()
export class LandingPagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    private readonly pricing: PricingService,
  ) {}

  // ---------------------------------------------------------------- admin

  listForAdmin() {
    return this.prisma.landingPage.findMany({
      include: { product: { select: { nameFr: true } }, orders: { select: { total: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async findForAdmin(id: string) {
    const page = await this.prisma.landingPage.findUnique({ where: { id }, include: { product: true } });
    if (!page) throw new NotFoundException("Landing page introuvable");
    return page;
  }

  // Sans ce contrôle, un compte à rebours dont la fin précède le début est
  // enregistré sans erreur — la landing page publique affiche alors un
  // minuteur déjà expiré (ou négatif) dès sa mise en ligne, silencieusement.
  private assertValidCountdown(dto: UpsertLandingPageDto) {
    if (dto.countdownStartAt && dto.countdownEndAt) {
      if (new Date(dto.countdownStartAt).getTime() >= new Date(dto.countdownEndAt).getTime()) {
        throw new BadRequestException("La fin du compte à rebours doit être postérieure à son début");
      }
    }
  }

  async create(dto: UpsertLandingPageDto) {
    this.assertValidCountdown(dto);
    await this.assertSlugAvailable(dto.slug);
    // assertSlugAvailable reste une vérification rapide pour l'UX, mais ne
    // protège pas seule contre deux créations concurrentes sur le même slug
    // (TOCTOU) — le catch de la contrainte unique en dessous est la garantie
    // réelle, comme pour categories/brands/products/cities/coupons.
    return runCatchingDuplicate(
      () => this.prisma.landingPage.create({ data: this.toData(dto) }),
      "Cette URL de landing page est déjà utilisée",
    );
  }

  async update(id: string, dto: UpsertLandingPageDto) {
    this.assertValidCountdown(dto);
    await this.assertSlugAvailable(dto.slug, id);
    const page = await this.prisma.landingPage.findUnique({ where: { id } });
    if (!page) throw new NotFoundException("Landing page introuvable");
    return runCatchingDuplicate(
      () => this.prisma.landingPage.update({ where: { id }, data: this.toData(dto) }),
      "Cette URL de landing page est déjà utilisée",
    );
  }

  async duplicate(id: string) {
    const source = await this.prisma.landingPage.findUnique({ where: { id } });
    if (!source) throw new NotFoundException("Landing page introuvable");
    let slug = `${source.slug}-copie`;
    let n = 1;
    while (await this.prisma.landingPage.findUnique({ where: { slug } })) {
      slug = `${source.slug}-copie-${++n}`;
    }
    const { id: _id, createdAt: _c, updatedAt: _u, visits: _v, ...rest } = source;
    return this.prisma.landingPage.create({
      data: { ...rest, blocks: rest.blocks as never, slug, name: `${source.name} (copie)`, status: "DRAFT", visits: 0 },
    });
  }

  async archive(id: string) {
    const page = await this.prisma.landingPage.findUnique({ where: { id } });
    if (!page) throw new NotFoundException("Landing page introuvable");
    return this.prisma.landingPage.update({ where: { id }, data: { status: "ARCHIVED" } });
  }

  /** §15 : visites / commandes / taux de conversion / CA / panier moyen. */
  async analytics(id: string) {
    const page = await this.prisma.landingPage.findUnique({ where: { id } });
    if (!page) throw new NotFoundException("Landing page introuvable");
    const orders = await this.prisma.order.findMany({ where: { landingPageId: id }, select: { total: true } });
    const orderCount = orders.length;
    const revenue = orders.reduce((s, o) => s + Number(o.total), 0);
    return {
      visits: page.visits,
      orders: orderCount,
      conversionRate: page.visits > 0 ? orderCount / page.visits : 0,
      revenue,
      avgOrderValue: orderCount > 0 ? revenue / orderCount : 0,
    };
  }

  private async assertSlugAvailable(slug: string, excludeId?: string) {
    const existing = await this.prisma.landingPage.findUnique({ where: { slug } });
    if (existing && existing.id !== excludeId) throw new BadRequestException("Cette URL de landing page est déjà utilisée");
  }

  private toData(dto: UpsertLandingPageDto) {
    return {
      name: dto.name,
      slug: dto.slug,
      productId: dto.productId,
      template: dto.template,
      theme: dto.theme,
      blocks: dto.blocks as never,
      displayPrice: dto.displayPrice,
      compareAtPrice: dto.compareAtPrice,
      primaryColor: dto.primaryColor,
      secondaryColor: dto.secondaryColor,
      ctaColor: dto.ctaColor,
      ctaLabel: dto.ctaLabel,
      countdownEnabled: dto.countdownEnabled ?? false,
      countdownStartAt: dto.countdownStartAt ? new Date(dto.countdownStartAt) : null,
      countdownEndAt: dto.countdownEndAt ? new Date(dto.countdownEndAt) : null,
      requireAddress: dto.requireAddress ?? false,
      successPhone: dto.successPhone,
      successWhatsapp: dto.successWhatsapp,
      successHours: dto.successHours,
      ...(dto.status ? { status: dto.status } : {}),
    };
  }

  // --------------------------------------------------------------- public

  async findBySlug(slug: string) {
    const page = await this.prisma.landingPage.findUnique({
      where: { slug },
      include: { product: { include: { images: true } } },
    });
    if (!page || page.status !== "ACTIVE") throw new NotFoundException("Page introuvable");
    // costPrice/reservedStock = données internes, jamais exposées au Front (cf. ProductsService.toPublicShape).
    const { costPrice: _costPrice, reservedStock: _reservedStock, ...product } = page.product;
    // page.displayPrice (prix spécial de la campagne, géré côté Front avec
    // priorité absolue) reste inchangé — seul le prix catalogue de repli
    // (product.promoPrice) passe par le moteur de prix centralisé, pour que
    // les pages sans displayPrice explicite reflètent quand même les
    // promotions catégorie/marque/boutique actives.
    const active = await this.pricing.getActivePromotions();
    const effective = this.pricing.resolveForProduct(product, active);
    return { ...page, product: { ...product, promoPrice: effective.compareAtPrice !== null ? effective.price : null } };
  }

  async trackVisit(slug: string) {
    await this.prisma.landingPage.updateMany({ where: { slug, status: "ACTIVE" }, data: { visits: { increment: 1 } } });
  }

  async quickOrder(slug: string, dto: QuickOrderDto) {
    const page = await this.prisma.landingPage.findUnique({ where: { slug } });
    if (!page || page.status !== "ACTIVE") throw new NotFoundException("Page introuvable");
    return this.orders.quickOrderFromLandingPage(page, dto);
  }
}
