import { Test } from "@nestjs/testing";
import type { INestApplicationContext } from "@nestjs/common";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { CustomerAuthService } from "../src/auth/customer-auth.service";

// customer-auth.service.ts#register rattachait automatiquement une nouvelle
// inscription à un client existant SANS mot de passe (créé par exemple via
// un checkout invité) dès que l'email OU le téléphone correspondait, et lui
// définissait alors le mot de passe fourni. Un attaquant connaissant
// seulement le TÉLÉPHONE d'un vrai client (bien moins secret qu'un email
// exact — visible sur un colis, partagé, deviné) pouvait donc "s'inscrire"
// avec ce téléphone et SA PROPRE adresse email/mot de passe, prenant
// instantanément le contrôle de la fiche existante (historique de commandes,
// points fidélité, adresses) — sans jamais avoir prouvé quoi que ce soit.
// Ces tests vérifient que seule une correspondance EXACTE d'email permet
// encore ce rattachement, jamais le téléphone seul.
describe("Registration cannot claim an existing account via phone alone (e2e)", () => {
  let app: INestApplicationContext;
  let prisma: PrismaService;
  let customerAuth: CustomerAuthService;

  const createdCustomerIds: string[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    customerAuth = app.get(CustomerAuthService);
  }, 30_000);

  afterAll(async () => {
    await prisma.refreshToken.deleteMany({ where: { subjectId: { in: createdCustomerIds } } });
    await prisma.loyaltyAccount.deleteMany({ where: { customerId: { in: createdCustomerIds } } });
    await prisma.wishlist.deleteMany({ where: { customerId: { in: createdCustomerIds } } });
    await prisma.customer.deleteMany({ where: { id: { in: createdCustomerIds } } });
    await app.close();
  }, 30_000);

  it("rejects registration attempting to claim an existing guest record by phone match alone", async () => {
    const victimPhone = `06${Date.now().toString().slice(-8)}`;
    const victim = await prisma.customer.create({
      data: { firstName: "Victime", lastName: "Invité", phone: victimPhone, passwordHash: null },
    });
    createdCustomerIds.push(victim.id);

    const attackerEmail = `attacker-register-${Date.now()}@example.com`;
    await expect(
      customerAuth.register({
        firstName: "Attaquant",
        lastName: "Malveillant",
        phone: victimPhone,
        email: attackerEmail,
        password: "AttackerPass123!",
      }),
    ).rejects.toThrow(/numéro de téléphone/);

    const victimAfter = await prisma.customer.findUnique({ where: { id: victim.id } });
    expect(victimAfter?.passwordHash).toBeNull(); // toujours aucun mot de passe : pas pris le contrôle
    expect(victimAfter?.firstName).toBe("Victime");
  });

  it("rejects registration with a phone matching one guest record and an email matching a different one", async () => {
    const phoneA = `07${Date.now().toString().slice(-8)}`;
    const custA = await prisma.customer.create({ data: { firstName: "A", phone: phoneA, passwordHash: null } });
    createdCustomerIds.push(custA.id);
    const emailB = `guest-b-${Date.now()}@example.com`;
    const custB = await prisma.customer.create({ data: { firstName: "B", email: emailB, passwordHash: null } });
    createdCustomerIds.push(custB.id);

    await expect(
      customerAuth.register({ firstName: "X", lastName: "Y", phone: phoneA, email: emailB, password: "SomePass123!" }),
    ).rejects.toThrow();

    expect((await prisma.customer.findUnique({ where: { id: custA.id } }))?.passwordHash).toBeNull();
    expect((await prisma.customer.findUnique({ where: { id: custB.id } }))?.passwordHash).toBeNull();
  });

  it("still allows the legitimate upgrade path: registering with the exact email of an existing guest record", async () => {
    const email = `legit-upgrade-${Date.now()}@example.com`;
    const guest = await prisma.customer.create({ data: { firstName: "Ancien Invité", email, passwordHash: null } });
    createdCustomerIds.push(guest.id);

    const result = await customerAuth.register({
      firstName: "Nouveau Nom",
      lastName: "Après Inscription",
      email,
      password: "LegitPass123!",
    });
    expect(result.accessToken).toBeTruthy();

    const upgraded = await prisma.customer.findUnique({ where: { id: guest.id } });
    expect(upgraded?.passwordHash).not.toBeNull();
    expect(upgraded?.firstName).toBe("Nouveau Nom");
  });

  it("still rejects registration outright when the matched account already has a password", async () => {
    const email = `already-registered-${Date.now()}@example.com`;
    const original = await customerAuth.register({ firstName: "Original", lastName: "User", email, password: "OriginalPass123!" });
    createdCustomerIds.push((await prisma.customer.findUniqueOrThrow({ where: { email } })).id);
    expect(original.accessToken).toBeTruthy();

    await expect(
      customerAuth.register({ firstName: "Impersonator", lastName: "User", email, password: "OtherPass123!" }),
    ).rejects.toThrow(/existe déjà/);
  });
});
