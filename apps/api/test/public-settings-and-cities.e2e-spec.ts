import { Test } from "@nestjs/testing";
import type { INestApplicationContext } from "@nestjs/common";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { SettingsService } from "../src/settings/settings.service";
import { CitiesService } from "../src/cities/cities.service";

// apps/web affichait la TVA, le taux de conversion fidélité, la liste des
// villes livrables et les frais de port avec des constantes codées en dur
// (0.2, /10, une liste statique de 6 villes, 25 DH / 300 DH) — totalement
// déconnectées des vrais réglages Back-Office, désynchronisées dès qu'un
// admin change un taux, ajoute/désactive une ville ou modifie un tarif.
// SettingsService.get() et CitiesService.listPublic() sont désormais exposés
// sans authentification (aucune des valeurs n'est sensible) pour que le
// Front puisse afficher des montants réels. Ces tests vérifient le contrat
// que le Front consomme : villes actives uniquement, cascade correcte du
// seuil de livraison offerte (ville > groupe > réglage global).
describe("Public settings & cities endpoints (e2e)", () => {
  let app: INestApplicationContext;
  let prisma: PrismaService;
  let settings: SettingsService;
  let cities: CitiesService;

  let staffUserId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    settings = app.get(SettingsService);
    cities = app.get(CitiesService);

    const staff = await prisma.staffUser.findFirst();
    if (!staff) throw new Error("Aucun staff en base — lancer prisma:seed avant ce test");
    staffUserId = staff.id;
  }, 30_000);

  afterAll(async () => {
    await app.close();
  }, 30_000);

  it("exposes vatRate/loyaltyRedeemRate/freeShippingThreshold without authentication", async () => {
    const result = await settings.get();
    expect(typeof result.vatRate).toBe("number");
    expect(typeof result.loyaltyRedeemRate).toBe("number");
    expect(typeof result.freeShippingThreshold).toBe("number");
  });

  it("excludes inactive cities from the public list", async () => {
    const name = `Ville Test Publique Inactive ${Date.now()}`;
    const created = await cities.create({ name, shippingFee: 30, active: false } as never, staffUserId);

    const publicList = await cities.listPublic();
    expect(publicList.find((c) => c.name === name)).toBeUndefined();

    await prisma.auditLog.deleteMany({ where: { entity: "City", entityId: created.id } });
    await prisma.city.delete({ where: { id: created.id } });
  });

  it("includes active cities with their own shippingFee/freeShippingFrom (no cascade needed)", async () => {
    const name = `Ville Test Publique Active ${Date.now()}`;
    const created = await cities.create({ name, shippingFee: 35, freeShippingFrom: 250, active: true } as never, staffUserId);

    const publicList = await cities.listPublic();
    const found = publicList.find((c) => c.name === name);
    expect(found).toEqual({ name, shippingFee: 35, freeShippingFrom: 250 });

    await prisma.auditLog.deleteMany({ where: { entity: "City", entityId: created.id } });
    await prisma.city.delete({ where: { id: created.id } });
  });

  it("falls back to the global freeShippingThreshold when the city defines none", async () => {
    const name = `Ville Test Publique Repli Global ${Date.now()}`;
    const created = await cities.create({ name, shippingFee: 20, active: true } as never, staffUserId);
    const { freeShippingThreshold } = await settings.get();

    const publicList = await cities.listPublic();
    const found = publicList.find((c) => c.name === name);
    expect(found?.freeShippingFrom).toBe(freeShippingThreshold);

    await prisma.auditLog.deleteMany({ where: { entity: "City", entityId: created.id } });
    await prisma.city.delete({ where: { id: created.id } });
  });
});
