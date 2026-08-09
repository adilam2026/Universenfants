import { Test } from "@nestjs/testing";
import type { INestApplicationContext } from "@nestjs/common";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { CustomerAuthService } from "../src/auth/customer-auth.service";
import { CartService } from "../src/cart/cart.service";
import { OrdersService } from "../src/orders/orders.service";

// orders.service.ts#resolveCustomer rattache automatiquement une commande
// invité à un client existant trouvé par email OU téléphone (§65/§239/§240).
// Avant ce correctif, ce rattachement écrasait aussi l'identité du client
// existant (firstName/lastName/email) avec ce que l'invité avait tapé —
// un attaquant connaissant seulement le TÉLÉPHONE d'un vrai client pouvait
// donc réassigner son EMAIL vers une adresse qu'il contrôle en passant une
// simple commande invité, puis recevoir à sa place le lien de
// réinitialisation de mot de passe de ce compte : prise de contrôle de
// compte sans authentification. Ce test reproduit l'attaque et vérifie
// qu'elle échoue désormais (l'email du client existant reste inchangé).
describe("Guest checkout cannot hijack an existing customer's identity (e2e)", () => {
  let app: INestApplicationContext;
  let prisma: PrismaService;
  let customerAuth: CustomerAuthService;
  let cartService: CartService;
  let ordersService: OrdersService;

  let categoryId: string;
  let productId: string;

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
    await prisma.cartLine.deleteMany({ where: { productId } });
    await prisma.product.delete({ where: { id: productId } });
    await prisma.category.delete({ where: { id: categoryId } });
    await app.close();
  }, 30_000);

  it("does not let a guest checkout reassign an existing customer's email by matching on phone", async () => {
    const victimPhone = `06${Date.now().toString().slice(-8)}`;
    const victimEmail = `victim-${Date.now()}@example.com`;
    const attackerEmail = `attacker-${Date.now()}@example.com`;

    await customerAuth.register({
      firstName: "Victime",
      lastName: "Réelle",
      email: victimEmail,
      phone: victimPhone,
      password: "VictimPass123!",
    });
    const victim = await prisma.customer.findFirst({ where: { phone: victimPhone } });
    expect(victim?.email).toBe(victimEmail);

    // "Attaquant" : commande invité en connaissant seulement le téléphone de
    // la victime, avec SA PROPRE adresse email dans le formulaire.
    const cart = await cartService.resolveCart(crypto.randomUUID(), null);
    await cartService.addLine(cart.id, { productId, quantity: 1 });
    await ordersService.checkout(cart.id, {
      firstName: "Attaquant",
      lastName: "Malveillant",
      phone: victimPhone,
      email: attackerEmail,
      city: "Casablanca",
      addressLine: "1 rue de l'attaquant",
    });

    const victimAfter = await prisma.customer.findUnique({ where: { id: victim!.id } });
    expect(victimAfter?.email).toBe(victimEmail); // toujours l'email de la victime, pas celui de l'attaquant
    expect(victimAfter?.firstName).toBe("Victime"); // le nom de la victime n'a pas été écrasé non plus

    // La commande de l'attaquant est bien rattachée au même client (comportement
    // de rattachement automatique préservé), mais sans corrompre son identité.
    const orders = await prisma.order.findMany({ where: { customerId: victim!.id } });
    expect(orders.length).toBeGreaterThan(0);

    await prisma.orderLine.deleteMany({ where: { order: { customerId: victim!.id } } });
    await prisma.order.deleteMany({ where: { customerId: victim!.id } });
    await prisma.refreshToken.deleteMany({ where: { subjectId: victim!.id } });
    await prisma.loyaltyAccount.deleteMany({ where: { customerId: victim!.id } });
    await prisma.wishlist.deleteMany({ where: { customerId: victim!.id } });
    await prisma.customer.delete({ where: { id: victim!.id } });
  });
});
