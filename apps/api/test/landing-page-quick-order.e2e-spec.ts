import { Test } from "@nestjs/testing";
import type { INestApplicationContext } from "@nestjs/common";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { LandingPagesService } from "../src/landing-pages/landing-pages.service";

// orders.service.ts#quickOrderFromLandingPage (§11/§12) n'avait aucune
// couverture e2e directe alors que c'est un chemin de commande à part
// entière (formulaire minimal, sans compte ni panier) avec sa propre
// logique de prix : displayPrice (choisi par l'admin pour LA campagne)
// prime toujours sur le moteur de prix centralisé, qui ne sert que de repli
// quand displayPrice n'est pas défini.
describe("Landing page quick order (e2e)", () => {
  let app: INestApplicationContext;
  let prisma: PrismaService;
  let landingPages: LandingPagesService;

  let categoryId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    landingPages = app.get(LandingPagesService);

    const city = await prisma.city.findFirst({ where: { active: true } });
    if (!city) throw new Error("Aucune ville active en base — lancer prisma:seed avant ce test");

    const category = await prisma.category.create({
      data: { nameFr: "Test landing quick order", slug: `test-lp-quick-order-${Date.now()}` },
    });
    categoryId = category.id;
  }, 30_000);

  afterAll(async () => {
    await prisma.category.delete({ where: { id: categoryId } });
    await app.close();
  }, 30_000);

  async function createProduct(price: number, stock: number) {
    return prisma.product.create({
      data: {
        sku: `LP-QUICK-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        nameFr: "Produit test quick order",
        categoryId,
        price,
        costPrice: Math.round(price / 2),
        seoUrl: `produit-test-lp-quick-order-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        stock,
        status: "ACTIVE",
      },
    });
  }

  async function createLandingPage(productId: string, displayPrice: number | null) {
    return prisma.landingPage.create({
      data: {
        name: "Landing quick order",
        slug: `lp-quick-order-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        productId,
        template: "single-product",
        theme: "universenfants",
        blocks: [],
        displayPrice,
        status: "ACTIVE",
      },
    });
  }

  async function cleanup(productId: string, landingPageId: string) {
    const orders = await prisma.order.findMany({ where: { landingPageId } });
    await prisma.orderLine.deleteMany({ where: { orderId: { in: orders.map((o) => o.id) } } });
    await prisma.order.deleteMany({ where: { landingPageId } });
    await prisma.landingPage.delete({ where: { id: landingPageId } });
    await prisma.product.delete({ where: { id: productId } });
  }

  it("rejects a countdown whose end precedes its start", async () => {
    const product = await createProduct(150, 10);
    await expect(
      landingPages.create({
        name: "Landing countdown inversé",
        slug: `lp-countdown-${Date.now()}`,
        productId: product.id,
        template: "flash-promo",
        theme: "promo-flash",
        blocks: [],
        countdownEnabled: true,
        countdownStartAt: new Date(Date.now() + 86_400_000).toISOString(),
        countdownEndAt: new Date(Date.now() - 86_400_000).toISOString(),
      } as never),
    ).rejects.toThrow(/postérieure à son début/);

    await prisma.product.delete({ where: { id: product.id } });
  });

  it("charges the campaign's displayPrice, not the catalog price, even with an active promotion", async () => {
    const product = await createProduct(200, 10);
    const promo = await prisma.promotion.create({
      data: {
        name: "Promo catégorie non liée à la campagne",
        type: "PERCENTAGE",
        value: 50,
        scope: "CATEGORY",
        categoryId,
        status: "ACTIVE",
        startAt: new Date(Date.now() - 86_400_000),
        endAt: new Date(Date.now() + 86_400_000),
      },
    });
    const page = await createLandingPage(product.id, 149);

    const result = await landingPages.quickOrder(page.slug, {
      name: "Client Rapide",
      phone: `06${Date.now().toString().slice(-8)}`,
      city: "Casablanca",
      quantity: 1,
    });
    expect(Number(result.total)).toBeGreaterThanOrEqual(149); // displayPrice + éventuels frais de port

    const order = await prisma.order.findFirst({ where: { orderNumber: result.orderNumber }, include: { lines: true } });
    expect(Number(order!.lines[0].sellPriceSnapshot)).toBe(149); // jamais 100 (200 - 50%)

    await prisma.promotion.delete({ where: { id: promo.id } });
    await cleanup(product.id, page.id);
  });

  it("falls back to the centralized pricing engine when displayPrice is not set", async () => {
    const product = await createProduct(200, 10);
    const promo = await prisma.promotion.create({
      data: {
        name: "Promo catégorie repli",
        type: "FIXED_AMOUNT",
        value: 60,
        scope: "CATEGORY",
        categoryId,
        status: "ACTIVE",
        startAt: new Date(Date.now() - 86_400_000),
        endAt: new Date(Date.now() + 86_400_000),
      },
    });
    const page = await createLandingPage(product.id, null);

    const result = await landingPages.quickOrder(page.slug, {
      name: "Client Rapide",
      phone: `07${Date.now().toString().slice(-8)}`,
      city: "Casablanca",
      quantity: 1,
    });

    const order = await prisma.order.findFirst({ where: { orderNumber: result.orderNumber }, include: { lines: true } });
    expect(Number(order!.lines[0].sellPriceSnapshot)).toBe(140); // 200 - 60, via le moteur de prix

    await prisma.promotion.delete({ where: { id: promo.id } });
    await cleanup(product.id, page.id);
  });

  it("reserves stock and rejects the quick order when stock is insufficient", async () => {
    const product = await createProduct(100, 2);
    const page = await createLandingPage(product.id, 100);

    await expect(
      landingPages.quickOrder(page.slug, {
        name: "Client Rapide",
        phone: `08${Date.now().toString().slice(-8)}`,
        city: "Casablanca",
        quantity: 5,
      }),
    ).rejects.toThrow(/[Ss]tock/);

    const stillAvailable = await prisma.product.findUnique({ where: { id: product.id } });
    expect(stillAvailable?.reservedStock).toBe(0); // rien n'a été réservé pour une commande rejetée

    await cleanup(product.id, page.id);
  });

  it("rejects a quick order on an inactive/archived landing page", async () => {
    const product = await createProduct(100, 10);
    const page = await createLandingPage(product.id, 100);
    await prisma.landingPage.update({ where: { id: page.id }, data: { status: "ARCHIVED" } });

    await expect(
      landingPages.quickOrder(page.slug, {
        name: "Client Rapide",
        phone: `09${Date.now().toString().slice(-8)}`,
        city: "Casablanca",
      }),
    ).rejects.toThrow(/introuvable/);

    await cleanup(product.id, page.id);
  });
});
