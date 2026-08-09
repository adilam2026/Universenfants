import { Test } from "@nestjs/testing";
import type { INestApplicationContext } from "@nestjs/common";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { CustomerAuthService } from "../src/auth/customer-auth.service";

// Espace client : gestion du profil (prénom/nom/téléphone immédiat,
// changement d'email en deux temps avec confirmation par email envoyé à la
// NOUVELLE adresse). Couvre aussi les impacts croisés demandés
// explicitement : l'historique client, la fidélité et la wishlist restent
// intacts après un changement d'email/téléphone puisqu'ils sont tous
// rattachés par customerId, jamais par email/téléphone.
describe("Customer profile management (e2e)", () => {
  let app: INestApplicationContext;
  let prisma: PrismaService;
  let authService: CustomerAuthService;

  const suffix = Date.now();
  const password = "TestPass123!";

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    authService = app.get(CustomerAuthService);
  }, 30_000);

  afterAll(async () => {
    await app.close();
  }, 30_000);

  async function registerCustomer(tag: string) {
    const email = `profile-${tag}-${suffix}@example.com`;
    const { accessToken } = await authService.register({
      firstName: "Avant",
      lastName: "Modification",
      email,
      password,
    });
    const customer = await prisma.customer.findUniqueOrThrow({ where: { email } });
    return { email, accessToken, customerId: customer.id };
  }

  afterEach(async () => {
    // cleanup handled per-test via customerId collected below
  });

  it("updates firstName/lastName immediately, with no password required", async () => {
    const { customerId } = await registerCustomer("name");
    const result = await authService.updateProfile(customerId, { firstName: "Après", lastName: "Changement" });
    expect(result.firstName).toBe("Après");
    expect(result.lastName).toBe("Changement");

    await prisma.customer.delete({ where: { id: customerId } });
  });

  it("rejects a phone change without the current password", async () => {
    const { customerId } = await registerCustomer("phone-nopass");
    await expect(authService.updateProfile(customerId, { phone: `06${suffix}` })).rejects.toThrow(/Mot de passe/);

    await prisma.customer.delete({ where: { id: customerId } });
  });

  it("rejects a phone change with a wrong password", async () => {
    const { customerId } = await registerCustomer("phone-wrongpass");
    await expect(
      authService.updateProfile(customerId, { phone: `06${suffix}1`, password: "WrongPass!" }),
    ).rejects.toThrow(/Mot de passe/);

    await prisma.customer.delete({ where: { id: customerId } });
  });

  it("accepts a phone change with the correct password", async () => {
    const { customerId } = await registerCustomer("phone-ok");
    const newPhone = `06${suffix}2`;
    const result = await authService.updateProfile(customerId, { phone: newPhone, password });
    expect(result.phone).toBe(newPhone);

    await prisma.customer.delete({ where: { id: customerId } });
  });

  it("rejects a phone already used by another customer account", async () => {
    const a = await registerCustomer("phone-collision-a");
    const b = await registerCustomer("phone-collision-b");
    const sharedPhone = `06${suffix}3`;
    await authService.updateProfile(a.customerId, { phone: sharedPhone, password });

    await expect(
      authService.updateProfile(b.customerId, { phone: sharedPhone, password }),
    ).rejects.toThrow(/déjà utilisé/);

    await prisma.customer.delete({ where: { id: a.customerId } });
    await prisma.customer.delete({ where: { id: b.customerId } });
  });

  it("does not change the email until the confirmation link is used, and rejects a wrong password", async () => {
    const { customerId, email } = await registerCustomer("email-flow");
    const newEmail = `profile-email-new-${suffix}@example.com`;

    await expect(
      authService.requestEmailChange(customerId, { newEmail, password: "WrongPass!" }),
    ).rejects.toThrow(/Mot de passe/);

    await authService.requestEmailChange(customerId, { newEmail, password });
    const afterRequest = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
    expect(afterRequest.email).toBe(email); // toujours l'ancien email tant que non confirmé
    expect(afterRequest.pendingEmail).toBe(newEmail);
    expect(afterRequest.emailChangeToken).toBeTruthy();

    const confirmed = await authService.confirmEmailChange({ token: afterRequest.emailChangeToken! });
    expect(confirmed.email).toBe(newEmail);
    const afterConfirm = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
    expect(afterConfirm.email).toBe(newEmail);
    expect(afterConfirm.pendingEmail).toBeNull();
    expect(afterConfirm.emailChangeToken).toBeNull();

    await prisma.customer.delete({ where: { id: customerId } });
  });

  it("rejects requesting an email already used by another account", async () => {
    const a = await registerCustomer("email-collision-a");
    const b = await registerCustomer("email-collision-b");

    await expect(
      authService.requestEmailChange(b.customerId, { newEmail: a.email, password }),
    ).rejects.toThrow(/déjà utilisée/);

    await prisma.customer.delete({ where: { id: a.customerId } });
    await prisma.customer.delete({ where: { id: b.customerId } });
  });

  it("rejects an expired or unknown confirmation token", async () => {
    await expect(authService.confirmEmailChange({ token: "not-a-real-token" })).rejects.toThrow(/invalide ou expiré/);
  });

  it("keeps order history, loyalty points, and wishlist intact across an email + phone change (all keyed by customerId)", async () => {
    const { customerId, email } = await registerCustomer("cross-impact");

    // Simule un historique existant : commande, points fidélité, wishlist.
    const category = await prisma.category.create({
      data: { nameFr: "Test impact profil", slug: `test-profile-impact-${suffix}` },
    });
    const product = await prisma.product.create({
      data: {
        sku: `PROFILE-IMPACT-${suffix}`,
        nameFr: "Produit test impact profil",
        categoryId: category.id,
        price: 100,
        costPrice: 50,
        seoUrl: `produit-test-profile-impact-${suffix}`,
        stock: 5,
        status: "ACTIVE",
      },
    });
    const order = await prisma.order.create({
      data: {
        orderNumber: `UE-TEST-PROFILE-${suffix}`,
        customerId,
        subtotal: 100,
        shippingFee: 0,
        vatAmount: 0,
        total: 100,
        shippingCity: "Casablanca",
        shippingAddress: "1 rue test",
        shippingPhone: "0600000000",
        status: "DELIVERED",
      },
    });
    await prisma.loyaltyAccount.update({ where: { customerId }, data: { pointsBalance: 42 } });
    const wishlist = await prisma.wishlist.findUniqueOrThrow({ where: { customerId } });
    await prisma.wishlistLine.create({ data: { wishlistId: wishlist.id, productId: product.id } });

    // Changement de téléphone + email.
    await authService.updateProfile(customerId, { phone: `06${suffix}9`, password });
    const newEmail = `profile-cross-impact-new-${suffix}@example.com`;
    await authService.requestEmailChange(customerId, { newEmail, password });
    const withToken = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
    await authService.confirmEmailChange({ token: withToken.emailChangeToken! });

    // Tout reste rattaché au même customerId, rien n'a été perdu ni dupliqué.
    const finalOrders = await prisma.order.findMany({ where: { customerId } });
    expect(finalOrders).toHaveLength(1);
    expect(finalOrders[0].id).toBe(order.id);

    const finalLoyalty = await prisma.loyaltyAccount.findUniqueOrThrow({ where: { customerId } });
    expect(finalLoyalty.pointsBalance).toBe(42);

    const finalWishlist = await prisma.wishlistLine.findMany({ where: { wishlistId: wishlist.id } });
    expect(finalWishlist).toHaveLength(1);

    const finalCustomer = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
    expect(finalCustomer.email).toBe(newEmail);
    expect(finalCustomer.email).not.toBe(email);

    // Le compte reste connectable avec le nouvel identifiant (email) et le même mot de passe.
    const login = await authService.login({ identifier: newEmail, password });
    expect(login.accessToken).toBeTruthy();

    await prisma.wishlistLine.deleteMany({ where: { wishlistId: wishlist.id } });
    await prisma.order.delete({ where: { id: order.id } });
    await prisma.product.delete({ where: { id: product.id } });
    await prisma.category.delete({ where: { id: category.id } });
    await prisma.customer.delete({ where: { id: customerId } });
  });
});
