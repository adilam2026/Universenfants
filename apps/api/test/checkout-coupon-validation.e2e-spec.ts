import { Test } from "@nestjs/testing";
import type { INestApplicationContext } from "@nestjs/common";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { CartService } from "../src/cart/cart.service";
import { OrdersService } from "../src/orders/orders.service";

// cart.service.ts#applyCoupon valide statut/dates/montant minimum au moment
// où le coupon est attaché au panier, mais rien ne les re-vérifiait à
// checkout() — un coupon appliqué pendant qu'il était valide restait
// utilisable même après expiration, désactivation par un admin, ou une fois
// le panier repassé sous le montant minimum. Ces tests vérifient que
// checkout() re-valide bien ces règles au moment de l'achat, pas seulement
// à l'application du coupon.
describe("Checkout coupon re-validation (e2e)", () => {
  let app: INestApplicationContext;
  let prisma: PrismaService;
  let cartService: CartService;
  let ordersService: OrdersService;

  let categoryId: string;
  let productId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    cartService = app.get(CartService);
    ordersService = app.get(OrdersService);

    const city = await prisma.city.findFirst({ where: { active: true } });
    if (!city) throw new Error("Aucune ville active en base — lancer prisma:seed avant ce test");

    const category = await prisma.category.create({
      data: { nameFr: "Test validation coupon", slug: `test-coupon-validation-${Date.now()}` },
    });
    categoryId = category.id;

    const product = await prisma.product.create({
      data: {
        sku: `COUPON-VAL-${Date.now()}`,
        nameFr: "Produit test validation coupon",
        categoryId,
        price: 100,
        costPrice: 50,
        seoUrl: `produit-test-coupon-validation-${Date.now()}`,
        stock: 20,
        status: "ACTIVE",
      },
    });
    productId = product.id;
  }, 30_000);

  afterAll(async () => {
    await prisma.cartLine.deleteMany({ where: { productId } });
    await prisma.product.delete({ where: { id: productId } });
    await prisma.category.delete({ where: { id: categoryId } });
    await app.close();
  }, 30_000);

  async function buildCartWithCoupon(quantity: number, couponCode: string) {
    const cart = await cartService.resolveCart(crypto.randomUUID(), null);
    await cartService.addLine(cart.id, { productId, quantity });
    // Attache directement le coupon au panier (contourne applyCoupon) pour
    // simuler un coupon qui était valide au moment de l'application mais ne
    // l'est plus au moment du checkout.
    await prisma.cart.update({ where: { id: cart.id }, data: { couponCode } });
    return cart.id;
  }

  function checkoutDto(suffix: string) {
    return {
      firstName: "Coupon",
      lastName: `Validation-${suffix}`,
      phone: `06${suffix.padStart(8, "0")}`,
      city: "Casablanca",
      addressLine: "1 rue de la validation",
    };
  }

  it("rejects checkout with a coupon that has expired since it was applied to the cart", async () => {
    const coupon = await prisma.coupon.create({
      data: {
        code: `EXPIRED-${Date.now()}`,
        type: "FIXED_AMOUNT",
        value: 10,
        maxUsesPerCustomer: 5,
        status: "ACTIVE",
        startAt: new Date(Date.now() - 2 * 86_400_000),
        endAt: new Date(Date.now() - 86_400_000), // expiré depuis hier
      },
    });
    const cartId = await buildCartWithCoupon(1, coupon.code);

    await expect(ordersService.checkout(cartId, checkoutDto("11122233"))).rejects.toThrow(/n'est plus valide/);

    await prisma.coupon.delete({ where: { id: coupon.id } });
  });

  it("rejects checkout with a coupon an admin ended (status ENDED) after it was applied to the cart", async () => {
    const coupon = await prisma.coupon.create({
      data: {
        code: `DEACTIVATED-${Date.now()}`,
        type: "FIXED_AMOUNT",
        value: 10,
        maxUsesPerCustomer: 5,
        status: "ENDED",
        startAt: new Date(Date.now() - 86_400_000),
        endAt: new Date(Date.now() + 86_400_000),
      },
    });
    const cartId = await buildCartWithCoupon(1, coupon.code);

    await expect(ordersService.checkout(cartId, checkoutDto("44455566"))).rejects.toThrow(/n'est plus valide/);

    await prisma.coupon.delete({ where: { id: coupon.id } });
  });

  it("rejects checkout when the cart fell below the coupon's minimum amount after it was applied", async () => {
    const coupon = await prisma.coupon.create({
      data: {
        code: `MINAMOUNT-${Date.now()}`,
        type: "FIXED_AMOUNT",
        value: 10,
        maxUsesPerCustomer: 5,
        minCartAmount: 500, // le panier de test ne fait que 100 (quantité 1 x prix 100)
        status: "ACTIVE",
        startAt: new Date(Date.now() - 86_400_000),
        endAt: new Date(Date.now() + 86_400_000),
      },
    });
    const cartId = await buildCartWithCoupon(1, coupon.code);

    await expect(ordersService.checkout(cartId, checkoutDto("77788899"))).rejects.toThrow(/n'est plus valide/);

    await prisma.coupon.delete({ where: { id: coupon.id } });
  });

  it("still allows checkout without a coupon, and with a genuinely valid one", async () => {
    const cartNoCoupon = await cartService.resolveCart(crypto.randomUUID(), null);
    await cartService.addLine(cartNoCoupon.id, { productId, quantity: 1 });
    const orderA = await ordersService.checkout(cartNoCoupon.id, checkoutDto("10101010"));
    expect(Number(orderA.discount)).toBe(0);

    const coupon = await prisma.coupon.create({
      data: {
        code: `VALID-${Date.now()}`,
        type: "FIXED_AMOUNT",
        value: 10,
        maxUsesPerCustomer: 5,
        minCartAmount: 0,
        status: "ACTIVE",
        startAt: new Date(Date.now() - 86_400_000),
        endAt: new Date(Date.now() + 86_400_000),
      },
    });
    const cartWithCoupon = await buildCartWithCoupon(1, coupon.code);
    const orderB = await ordersService.checkout(cartWithCoupon, checkoutDto("20202020"));
    expect(Number(orderB.discount)).toBe(10);

    await prisma.couponRedemption.deleteMany({ where: { couponId: coupon.id } });
    await prisma.coupon.delete({ where: { id: coupon.id } });
    await prisma.orderLine.deleteMany({ where: { orderId: { in: [orderA.id, orderB.id] } } });
    await prisma.order.deleteMany({ where: { id: { in: [orderA.id, orderB.id] } } });
  });
});
