import { Test } from "@nestjs/testing";
import type { INestApplicationContext } from "@nestjs/common";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { CustomerAuthService } from "../src/auth/customer-auth.service";
import { CartService } from "../src/cart/cart.service";
import { OrdersService } from "../src/orders/orders.service";

// orders.service.ts#resolveCustomer décide si une commande invité se rattache
// automatiquement à un client existant (§65/§239/§240). Un téléphone seul
// n'est jamais une preuve d'identité (décision produit explicite) : ce
// rattachement n'a plus lieu QUE sur correspondance EXACTE d'email, jamais
// sur le seul téléphone — trivialement plus facile à connaître/deviner pour
// un tiers (colis, partage, liste de contacts) qu'un email exact. Avant ce
// correctif (et le précédent sur l'écrasement d'identité), connaître
// seulement le téléphone d'un vrai client suffisait à faire attacher une
// commande d'un inconnu à son compte, voire à réassigner son email.
describe("Guest checkout never attaches to an existing account by phone alone (e2e)", () => {
  let app: INestApplicationContext;
  let prisma: PrismaService;
  let customerAuth: CustomerAuthService;
  let cartService: CartService;
  let ordersService: OrdersService;

  let categoryId: string;
  let productId: string;
  const createdCustomerIds: string[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    customerAuth = app.get(CustomerAuthService);
    cartService = app.get(CartService);
    ordersService = app.get(OrdersService);

    const city = await prisma.city.findFirst({ where: { active: true } });
    if (!city) throw new Error("Aucune ville active en base — lancer prisma:seed avant ce test");

    const category = await prisma.category.create({
      data: { nameFr: "Test sécurité checkout invité", slug: `test-guest-identity-${Date.now()}` },
    });
    categoryId = category.id;

    const product = await prisma.product.create({
      data: {
        sku: `GUEST-IDENTITY-${Date.now()}`,
        nameFr: "Produit test sécurité checkout invité",
        categoryId,
        price: 100,
        costPrice: 50,
        seoUrl: `produit-test-guest-identity-${Date.now()}`,
        stock: 20,
        status: "ACTIVE",
      },
    });
    productId = product.id;
  }, 30_000);

  afterAll(async () => {
    await prisma.orderLine.deleteMany({ where: { order: { customerId: { in: createdCustomerIds } } } });
    await prisma.order.deleteMany({ where: { customerId: { in: createdCustomerIds } } });
    await prisma.refreshToken.deleteMany({ where: { subjectId: { in: createdCustomerIds } } });
    await prisma.loyaltyAccount.deleteMany({ where: { customerId: { in: createdCustomerIds } } });
    await prisma.wishlist.deleteMany({ where: { customerId: { in: createdCustomerIds } } });
    await prisma.customer.deleteMany({ where: { id: { in: createdCustomerIds } } });
    await prisma.cartLine.deleteMany({ where: { productId } });
    await prisma.product.delete({ where: { id: productId } });
    await prisma.category.delete({ where: { id: categoryId } });
    await app.close();
  }, 30_000);

  async function checkoutAsGuest(overrides: { phone: string; email?: string }) {
    const cart = await cartService.resolveCart(crypto.randomUUID(), null);
    await cartService.addLine(cart.id, { productId, quantity: 1 });
    return ordersService.checkout(cart.id, {
      firstName: "Invité",
      lastName: "Test",
      city: "Casablanca",
      addressLine: "1 rue du test",
      ...overrides,
    });
  }

  it("never attaches a guest order to an existing customer by phone match alone, and never touches their identity", async () => {
    const victimPhone = `06${Date.now().toString().slice(-8)}`;
    const victimEmail = `victim-${Date.now()}@example.com`;
    const strangerEmail = `stranger-${Date.now()}@example.com`;

    await customerAuth.register({
      firstName: "Victime",
      lastName: "Réelle",
      email: victimEmail,
      phone: victimPhone,
      password: "VictimPass123!",
    });
    const victim = await prisma.customer.findUniqueOrThrow({ where: { email: victimEmail } });
    createdCustomerIds.push(victim.id);

    // Un inconnu passe une commande invité en connaissant seulement le
    // téléphone de la victime, avec sa propre adresse email.
    const order = await checkoutAsGuest({ phone: victimPhone, email: strangerEmail });

    const victimAfter = await prisma.customer.findUnique({ where: { id: victim.id } });
    expect(victimAfter?.email).toBe(victimEmail);
    expect(victimAfter?.firstName).toBe("Victime");
    // Aucune commande de l'inconnu n'apparaît dans l'historique de la victime.
    const victimOrders = await prisma.order.findMany({ where: { customerId: victim.id } });
    expect(victimOrders).toHaveLength(0);

    // La commande de l'inconnu a bien été créée, mais sur une fiche cliente
    // SÉPARÉE — jamais celle de la victime.
    expect(order.customerId).not.toBe(victim.id);
    createdCustomerIds.push(order.customerId);
    const stranger = await prisma.customer.findUnique({ where: { id: order.customerId } });
    // Le téléphone en conflit n'a pas été volé à la victime : la nouvelle
    // fiche n'a simplement pas ce numéro (conservé uniquement sur la
    // commande elle-même, shippingPhone).
    expect(stranger?.phone).toBeNull();
    expect(order.shippingPhone).toBe(victimPhone);
  });

  it("still attaches to an existing passwordless guest record when the email matches exactly", async () => {
    const email = `legit-guest-${Date.now()}@example.com`;
    const firstOrder = await checkoutAsGuest({ phone: `07${Math.random().toString().slice(2, 10)}`, email });
    createdCustomerIds.push(firstOrder.customerId);

    // Même client, deuxième commande, même email — doit se rattacher à la
    // même fiche (comportement métier voulu, préservé).
    const secondOrder = await checkoutAsGuest({ phone: `08${Math.random().toString().slice(2, 10)}`, email });
    expect(secondOrder.customerId).toBe(firstOrder.customerId);
  });

  it("creates independent customer records for two different guests who happen to share a phone number", async () => {
    const sharedPhone = `09${Math.random().toString().slice(2, 10)}`;
    const orderA = await checkoutAsGuest({ phone: sharedPhone, email: `guest-a-${Date.now()}@example.com` });
    createdCustomerIds.push(orderA.customerId);
    const orderB = await checkoutAsGuest({ phone: sharedPhone, email: `guest-b-${Date.now()}@example.com` });
    createdCustomerIds.push(orderB.customerId);

    expect(orderA.customerId).not.toBe(orderB.customerId);
    expect(orderA.shippingPhone).toBe(sharedPhone);
    expect(orderB.shippingPhone).toBe(sharedPhone);
  });
});
