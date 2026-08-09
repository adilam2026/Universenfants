import { Test } from "@nestjs/testing";
import type { INestApplicationContext } from "@nestjs/common";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { ProductsService } from "../src/catalog/products/products.service";
import { CartService } from "../src/cart/cart.service";
import { OrdersService } from "../src/orders/orders.service";

// Moteur de prix centralisé (demande client) : promoPrice produit, promotion
// catégorie et promotion marque ne se cumulent jamais — seule la plus
// avantageuse pour le client est retenue, et le même prix résolu doit
// apparaître partout (fiche produit, listing, panier, checkout), avec les
// coupons appliqués APRÈS détermination du prix promotionnel final.
describe("Effective pricing engine (e2e)", () => {
  let app: INestApplicationContext;
  let prisma: PrismaService;
  let productsService: ProductsService;
  let cartService: CartService;
  let ordersService: OrdersService;

  let categoryId: string;
  let brandId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    productsService = app.get(ProductsService);
    cartService = app.get(CartService);
    ordersService = app.get(OrdersService);

    const city = await prisma.city.findFirst({ where: { active: true } });
    if (!city) throw new Error("Aucune ville active en base — lancer prisma:seed avant ce test");

    const category = await prisma.category.create({
      data: { nameFr: "Test tarification", slug: `test-pricing-${Date.now()}` },
    });
    categoryId = category.id;
    const brand = await prisma.brand.create({
      data: { name: `Test Marque ${Date.now()}`, slug: `test-pricing-brand-${Date.now()}` },
    });
    brandId = brand.id;
  }, 30_000);

  afterAll(async () => {
    // Filet de sécurité : si un test échoue avant son propre nettoyage, on
    // évite de laisser des données orphelines bloquer la suppression de la
    // catégorie/marque de test (contrainte de clé étrangère sur Product).
    const leftovers = await prisma.product.findMany({ where: { categoryId }, select: { id: true } });
    for (const { id } of leftovers) await cleanupProduct(id);

    await prisma.category.delete({ where: { id: categoryId } });
    await prisma.brand.delete({ where: { id: brandId } });
    await app.close();
  }, 30_000);

  function activeWindow() {
    return { startAt: new Date(Date.now() - 86_400_000), endAt: new Date(Date.now() + 86_400_000) };
  }

  async function createProduct(price: number, promoPrice: number | null) {
    return prisma.product.create({
      data: {
        sku: `PRICING-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        nameFr: "Produit test tarification",
        categoryId,
        brandId,
        price,
        promoPrice,
        costPrice: Math.round(price / 2),
        seoUrl: `produit-test-pricing-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        stock: 20,
        status: "ACTIVE",
      },
    });
  }

  async function cleanupProduct(productId: string) {
    await prisma.cartLine.deleteMany({ where: { productId } });
    const lines = await prisma.orderLine.findMany({ where: { productId } });
    const orderIds = [...new Set(lines.map((l) => l.orderId))];
    await prisma.orderLine.deleteMany({ where: { productId } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.product.delete({ where: { id: productId } });
  }

  it("matches the client's exact example: product promoPrice wins over category and brand promotions", async () => {
    const product = await createProduct(200, 150);
    const categoryPromo = await prisma.promotion.create({
      data: { name: "Promo catégorie", type: "FIXED_AMOUNT", value: 40, scope: "CATEGORY", categoryId, status: "ACTIVE", ...activeWindow() },
    });
    const brandPromo = await prisma.promotion.create({
      data: { name: "Promo marque", type: "FIXED_AMOUNT", value: 30, scope: "BRAND", brandId, status: "ACTIVE", ...activeWindow() },
    });

    const detail = await productsService.findBySlug(product.seoUrl);
    expect(Number(detail.price)).toBe(200);
    expect(Number(detail.promoPrice)).toBe(150);

    const listing = await productsService.list({ category: undefined } as never);
    const listed = listing.items.find((i) => i.id === product.id);
    expect(Number(listed!.promoPrice)).toBe(150);

    await prisma.promotion.delete({ where: { id: categoryPromo.id } });
    await prisma.promotion.delete({ where: { id: brandPromo.id } });
    await cleanupProduct(product.id);
  });

  it("picks the category promotion when it is more advantageous than promoPrice and the brand promotion", async () => {
    const product = await createProduct(200, 190);
    const categoryPromo = await prisma.promotion.create({
      data: { name: "Promo catégorie forte", type: "PERCENTAGE", value: 30, scope: "CATEGORY", categoryId, status: "ACTIVE", ...activeWindow() },
    });

    const detail = await productsService.findBySlug(product.seoUrl);
    expect(Number(detail.promoPrice)).toBe(140); // 200 - 30%

    await prisma.promotion.delete({ where: { id: categoryPromo.id } });
    await cleanupProduct(product.id);
  });

  it("ignores an expired or inactive promotion", async () => {
    const product = await createProduct(200, null);
    const expired = await prisma.promotion.create({
      data: {
        name: "Promo expirée",
        type: "PERCENTAGE",
        value: 50,
        scope: "CATEGORY",
        categoryId,
        status: "ACTIVE",
        startAt: new Date(Date.now() - 2 * 86_400_000),
        endAt: new Date(Date.now() - 86_400_000),
      },
    });
    const scheduled = await prisma.promotion.create({
      data: { name: "Promo à venir", type: "PERCENTAGE", value: 50, scope: "BRAND", brandId, status: "SCHEDULED", ...activeWindow() },
    });

    const detail = await productsService.findBySlug(product.seoUrl);
    expect(detail.promoPrice).toBeNull();
    expect(Number(detail.price)).toBe(200);

    await prisma.promotion.delete({ where: { id: expired.id } });
    await prisma.promotion.delete({ where: { id: scheduled.id } });
    await cleanupProduct(product.id);
  });

  it("includes products under an active category promotion in the promoOnly filter even with no promoPrice of their own", async () => {
    // products.service.ts#list filtrait promoOnly directement sur la colonne
    // promoPrice, avant toute résolution des promotions catégorie/marque —
    // un produit sans promoPrice propre mais dont la catégorie a une promo
    // active affiche pourtant bien un prix barré sur sa fiche (test
    // précédent), donc il doit aussi ressortir du rail "Promotions" / du
    // filtre promo=1, pas en être absent.
    const unpromotedCategory = await prisma.category.create({
      data: { nameFr: "Test sans promo", slug: `test-no-promo-${Date.now()}` },
    });
    const productWithCategoryPromo = await createProduct(200, null);
    const productWithNoPromo = await prisma.product.create({
      data: {
        sku: `PRICING-NOPROMO-${Date.now()}`,
        nameFr: "Produit test sans promo",
        categoryId: unpromotedCategory.id,
        price: 80,
        costPrice: 40,
        seoUrl: `produit-test-no-promo-${Date.now()}`,
        stock: 20,
        status: "ACTIVE",
      },
    });
    const categoryPromo = await prisma.promotion.create({
      data: { name: "Promo catégorie promoOnly", type: "PERCENTAGE", value: 20, scope: "CATEGORY", categoryId, status: "ACTIVE", ...activeWindow() },
    });

    const listing = await productsService.list({ promoOnly: true } as never);
    const ids = listing.items.map((i) => i.id);
    expect(ids).toContain(productWithCategoryPromo.id);
    expect(ids).not.toContain(productWithNoPromo.id);

    await prisma.promotion.delete({ where: { id: categoryPromo.id } });
    await cleanupProduct(productWithCategoryPromo.id);
    await prisma.product.delete({ where: { id: productWithNoPromo.id } });
    await prisma.category.delete({ where: { id: unpromotedCategory.id } });
  });

  it("applies the resolved promotional price through cart and checkout, with the coupon computed on top of it", async () => {
    const product = await createProduct(200, 150);
    const categoryPromo = await prisma.promotion.create({
      data: { name: "Promo catégorie", type: "FIXED_AMOUNT", value: 40, scope: "CATEGORY", categoryId, status: "ACTIVE", ...activeWindow() },
    });

    const cart = await cartService.resolveCart(crypto.randomUUID(), null);
    await cartService.addLine(cart.id, { productId: product.id, quantity: 1 });
    const fullCart = await cartService.getFullCart(cart.id);
    expect(fullCart.subtotal).toBe(150); // pas 200 : le prix promotionnel, pas le prix catalogue

    const coupon = await prisma.coupon.create({
      data: {
        code: `PRICING-COUPON-${Date.now()}`,
        type: "PERCENTAGE",
        value: 10,
        maxUsesPerCustomer: 5,
        status: "ACTIVE",
        ...activeWindow(),
      },
    });
    const cartWithCoupon = await cartService.applyCoupon(cart.id, coupon.code);
    expect(cartWithCoupon.discount).toBe(15); // 10% de 150, pas de 200
    expect(cartWithCoupon.total).toBe(135);

    const city = await prisma.city.findFirst({ where: { name: "Casablanca" } });
    if (!city) throw new Error("Ville Casablanca introuvable en base — lancer prisma:seed avant ce test");
    const shippingFee = 150 >= Number(city.freeShippingFrom) ? 0 : Number(city.shippingFee);

    const order = await ordersService.checkout(cart.id, {
      firstName: "Pricing",
      lastName: "E2E",
      phone: "0655555555",
      city: "Casablanca",
      addressLine: "1 rue du prix",
    });
    expect(Number(order.lines[0].sellPriceSnapshot)).toBe(150);
    expect(Number(order.subtotal)).toBe(150);
    expect(Number(order.discount)).toBe(15);
    expect(Number(order.total)).toBe(150 - 15 + shippingFee); // panier → coupon → + frais de port, jamais recalculé sur le prix catalogue

    await prisma.couponRedemption.deleteMany({ where: { couponId: coupon.id } });
    await prisma.coupon.delete({ where: { id: coupon.id } });
    await prisma.promotion.delete({ where: { id: categoryPromo.id } });
    await cleanupProduct(product.id);
  });
});
