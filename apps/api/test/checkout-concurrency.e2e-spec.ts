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

  it("never double-processes a DELIVERED transition under concurrent status updates", async () => {
    // Même bug que le double-checkout, une couche plus loin : deux appels
    // updateStatus() concurrents sur la même commande (double-clic Back-Office,
    // deux membres du staff) sans verrou peuvent tous deux lire le même statut
    // de départ et exécuter chacun leurs effets de bord — déduction de stock
    // définitive ET crédit de points fidélité, donc deux fois.
    const product = await prisma.product.create({
      data: {
        sku: `CONC-DELIVER-${Date.now()}`,
        nameFr: "Produit test livraison concurrente",
        categoryId,
        price: 100,
        costPrice: 50,
        seoUrl: `produit-test-livraison-${Date.now()}`,
        stock: 10,
        status: "ACTIVE",
      },
    });

    const cart = await cartService.resolveCart(crypto.randomUUID(), null);
    await cartService.addLine(cart.id, { productId: product.id, quantity: 2 });
    const order = await ordersService.checkout(cart.id, checkoutDto("77777777"));

    const customer = await prisma.customer.findFirstOrThrow({ where: { orders: { some: { id: order.id } } } });
    await prisma.loyaltyAccount.upsert({
      where: { customerId: customer.id },
      update: { pointsBalance: 0 },
      create: { customerId: customer.id, pointsBalance: 0 },
    });
    const staff = await prisma.staffUser.findFirstOrThrow();

    // Fait progresser la commande jusqu'à SHIPPED (transitions séquentielles,
    // non concurrentes) — seule une commande SHIPPED peut passer à DELIVERED.
    await ordersService.updateStatus(order.id, { status: "CONFIRMED" }, staff.id);
    await ordersService.updateStatus(order.id, { status: "PREPARING" }, staff.id);
    await ordersService.updateStatus(order.id, { status: "SHIPPED" }, staff.id);

    const results = await Promise.allSettled([
      ordersService.updateStatus(order.id, { status: "DELIVERED" }, staff.id),
      ordersService.updateStatus(order.id, { status: "DELIVERED" }, staff.id),
    ]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    expect(fulfilled).toHaveLength(1);

    const updatedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(updatedProduct.stock).toBe(8); // 10 - 2, pas 10 - 4

    const loyaltyTx = await prisma.loyaltyTransaction.count({ where: { orderId: order.id, type: "EARN" } });
    expect(loyaltyTx).toBe(1);

    await prisma.loyaltyTransaction.deleteMany({ where: { orderId: order.id } });
    await prisma.orderStatusHistory.deleteMany({ where: { orderId: order.id } });
    await prisma.stockMovement.deleteMany({ where: { productId: product.id } });
    await prisma.orderLine.deleteMany({ where: { orderId: order.id } });
    await prisma.order.delete({ where: { id: order.id } });
    await prisma.cartLine.deleteMany({ where: { productId: product.id } });
    await prisma.product.delete({ where: { id: product.id } });
  });

  it("never lets a loyalty points balance go negative under concurrent redemption", async () => {
    // Même faille que les coupons, une couche plus loin : le solde de points
    // était lu avant la transaction puis décrémenté dedans sans jamais être
    // re-vérifié sous verrou. Deux checkouts concurrents du même client (deux
    // onglets, deux appareils) utilisant chacun tout son solde de points
    // pouvaient tous deux lire le même solde de départ et faire passer le
    // solde final en négatif.
    const product = await prisma.product.create({
      data: {
        sku: `CONC-LOYALTY-${Date.now()}`,
        nameFr: "Produit test points fidélité",
        categoryId,
        price: 1000,
        costPrice: 500,
        seoUrl: `produit-test-loyalty-${Date.now()}`,
        stock: 10,
        status: "ACTIVE",
      },
    });

    const customer = await prisma.customer.create({
      data: { firstName: "Loyalty", lastName: "Race", phone: `07${Date.now().toString().slice(-8)}` },
    });
    // 100 points, redeemRate 1 DH/point (valeur par défaut des Paramètres) —
    // largement suffisant pour être entièrement consommé par une seule des
    // deux commandes (chacune de 1000 DH de sous-total).
    await prisma.loyaltyAccount.create({ data: { customerId: customer.id, pointsBalance: 100 } });

    const cartA = await prisma.cart.create({ data: { ownerToken: crypto.randomUUID(), customerId: customer.id } });
    const cartB = await prisma.cart.create({ data: { ownerToken: crypto.randomUUID(), customerId: customer.id } });
    await cartService.addLine(cartA.id, { productId: product.id, quantity: 1 });
    await cartService.addLine(cartB.id, { productId: product.id, quantity: 1 });

    const dto = (suffix: string) => ({ ...checkoutDto(suffix), useLoyaltyPoints: true });
    const [a, b] = await Promise.allSettled([
      ordersService.checkout(cartA.id, dto("88888881")),
      ordersService.checkout(cartB.id, dto("88888882")),
    ]);

    const account = await prisma.loyaltyAccount.findUniqueOrThrow({ where: { customerId: customer.id } });
    expect(account.pointsBalance).toBeGreaterThanOrEqual(0);

    const redeemTx = await prisma.loyaltyTransaction.findMany({ where: { accountId: account.id, type: "REDEEM" } });
    const totalRedeemed = redeemTx.reduce((sum, t) => sum + Math.abs(t.points), 0);
    expect(totalRedeemed).toBeLessThanOrEqual(100);

    const orderIds = [a, b]
      .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof ordersService.checkout>>> => r.status === "fulfilled")
      .map((r) => r.value.id);
    await prisma.loyaltyTransaction.deleteMany({ where: { accountId: account.id } });
    await prisma.orderLine.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.cartLine.deleteMany({ where: { productId: product.id } });
    await prisma.cart.deleteMany({ where: { id: { in: [cartA.id, cartB.id] } } });
    await prisma.loyaltyAccount.delete({ where: { customerId: customer.id } });
    await prisma.customer.delete({ where: { id: customer.id } });
    await prisma.product.delete({ where: { id: product.id } });
  });
});
