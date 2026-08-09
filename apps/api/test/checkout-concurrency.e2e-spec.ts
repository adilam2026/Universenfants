import { Test } from "@nestjs/testing";
import type { INestApplicationContext } from "@nestjs/common";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { CartService } from "../src/cart/cart.service";
import { OrdersService } from "../src/orders/orders.service";
import { ProductsService } from "../src/catalog/products/products.service";

// Ces tests reproduisent en conditions réelles (vraie base Postgres, vraies
// transactions, vrais verrous SELECT ... FOR UPDATE) les deux bugs de
// concurrence trouvés lors de l'audit : double-commande sur double-clic, et
// dépassement de la limite d'utilisation d'un coupon. Un test unitaire sur
// des mocks ne peut pas révéler une race condition — il faut de vraies
// requêtes concurrentes contre une vraie base.
describe("Checkout concurrency (e2e)", () => {
  let app: INestApplicationContext;
  let prisma: PrismaService;
  let cartService: CartService;
  let ordersService: OrdersService;
  let productsService: ProductsService;

  let categoryId: string;
  let productId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    cartService = app.get(CartService);
    ordersService = app.get(OrdersService);
    productsService = app.get(ProductsService);

    const city = await prisma.city.findFirst({ where: { active: true } });
    if (!city) throw new Error("Aucune ville active en base — lancer prisma:seed avant ce test");

    const category = await prisma.category.create({
      data: { nameFr: "Test concurrence", slug: `test-concurrency-${Date.now()}` },
    });
    categoryId = category.id;

    const product = await prisma.product.create({
      data: {
        sku: `CONC-TEST-${Date.now()}`,
        nameFr: "Produit test concurrence",
        categoryId,
        price: 100,
        costPrice: 50,
        seoUrl: `produit-test-concurrence-${Date.now()}`,
        stock: 10,
        status: "ACTIVE",
      },
    });
    productId = product.id;
  }, 30_000);

  afterAll(async () => {
    await prisma.orderLine.deleteMany({ where: { productId } });
    await prisma.order.deleteMany({ where: { lines: { some: { productId } } } });
    await prisma.cartLine.deleteMany({ where: { productId } });
    await prisma.product.delete({ where: { id: productId } });
    await prisma.category.delete({ where: { id: categoryId } });
    await app.close();
  }, 30_000);

  async function buildCart(quantity: number) {
    const cart = await cartService.resolveCart(crypto.randomUUID(), null);
    await cartService.addLine(cart.id, { productId, quantity });
    return cart.id;
  }

  const city = "Casablanca";
  function checkoutDto(suffix: string) {
    return {
      firstName: "Concurrence",
      lastName: `Test-${suffix}`,
      phone: `06${suffix.padStart(8, "0")}`,
      city,
      addressLine: "1 rue de la concurrence",
    };
  }

  it("creates only one order when the same cart is checked out twice concurrently", async () => {
    const cartId = await buildCart(1);

    const [a, b] = await Promise.allSettled([
      ordersService.checkout(cartId, checkoutDto("11111111")),
      ordersService.checkout(cartId, checkoutDto("22222222")),
    ]);

    const fulfilled = [a, b].filter((r) => r.status === "fulfilled");
    const rejected = [a, b].filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason.message).toMatch(/déjà été validé/);
  });

  it("never oversells stock under concurrent checkouts of the same product", async () => {
    // Stock initial 10, deux paniers de 6 chacun : un seul doit passer, l'autre
    // doit échouer sur "Stock insuffisant" plutôt que de survendre à -2.
    const cartA = await buildCart(6);
    const cartB = await buildCart(6);

    const [a, b] = await Promise.allSettled([
      ordersService.checkout(cartA, checkoutDto("33333333")),
      ordersService.checkout(cartB, checkoutDto("44444444")),
    ]);

    const fulfilled = [a, b].filter((r) => r.status === "fulfilled");
    expect(fulfilled.length).toBeLessThanOrEqual(1);

    const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    expect(product.reservedStock).toBeLessThanOrEqual(product.stock);
  });

  it("never exceeds a coupon's global maxUses under concurrent redemption", async () => {
    const coupon = await prisma.coupon.create({
      data: {
        code: `CONC-COUPON-${Date.now()}`,
        type: "FIXED_AMOUNT",
        value: 10,
        maxUses: 1,
        maxUsesPerCustomer: 5,
        status: "ACTIVE",
        startAt: new Date(),
        endAt: new Date(Date.now() + 86_400_000),
      },
    });

    const cartA = await buildCart(1);
    const cartB = await buildCart(1);
    await prisma.cart.update({ where: { id: cartA }, data: { couponCode: coupon.code } });
    await prisma.cart.update({ where: { id: cartB }, data: { couponCode: coupon.code } });

    const [a, b] = await Promise.allSettled([
      ordersService.checkout(cartA, checkoutDto("55555555")),
      ordersService.checkout(cartB, checkoutDto("66666666")),
    ]);

    const fulfilled = [a, b].filter((r) => r.status === "fulfilled");
    expect(fulfilled).toHaveLength(1);

    const updatedCoupon = await prisma.coupon.findUniqueOrThrow({ where: { id: coupon.id } });
    expect(updatedCoupon.usedCount).toBe(1);

    await prisma.couponRedemption.deleteMany({ where: { couponId: coupon.id } });
    await prisma.coupon.delete({ where: { id: coupon.id } });
  });

  it("never loses updates under concurrent stock adjustments (SELECT ... FOR UPDATE)", async () => {
    // Sans le verrou de ligne dans adjustStock(), N décréments concurrents
    // lisant tous le même stock de départ produiraient un "lost update" :
    // le stock final serait supérieur à stock_initial - N au lieu d'être
    // exactement égal, chaque écriture écrasant la précédente au lieu de
    // s'accumuler.
    const product = await prisma.product.create({
      data: {
        sku: `CONC-STOCK-${Date.now()}`,
        nameFr: "Produit test ajustement stock",
        categoryId,
        price: 100,
        costPrice: 50,
        seoUrl: `produit-test-stock-${Date.now()}`,
        stock: 100,
        status: "ACTIVE",
      },
    });
    // staffUserId est une vraie FK vers StaffUser — on réutilise un compte
    // existant (créé par le seed) plutôt qu'une valeur arbitraire.
    const staff = await prisma.staffUser.findFirstOrThrow();

    const concurrentAdjustments = 20;
    const results = await Promise.allSettled(
      Array.from({ length: concurrentAdjustments }, () =>
        productsService.adjustStock(product.id, { delta: -1, reason: "INVENTORY_CORRECTION" }, staff.id),
      ),
    );

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    expect(fulfilled).toHaveLength(concurrentAdjustments);

    const updated = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(updated.stock).toBe(100 - concurrentAdjustments);

    const movements = await prisma.stockMovement.count({ where: { productId: product.id } });
    expect(movements).toBe(concurrentAdjustments);

    await prisma.stockMovement.deleteMany({ where: { productId: product.id } });
    await prisma.product.delete({ where: { id: product.id } });
  });
});
