import { Test } from "@nestjs/testing";
import type { INestApplicationContext } from "@nestjs/common";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { SettingsService } from "../src/settings/settings.service";
import { CitiesService } from "../src/cities/cities.service";

// Les actions Back-Office sensibles impactant le comportement de la
// plateforme (coupons, promotions, paramètres globaux, villes/frais de
// livraison) n'étaient tracées dans AuditLog que pour les changements de
// prix produit et de statut de commande — rien pour ces quatre surfaces,
// pourtant tout aussi sensibles financièrement. Ces tests vérifient que
// chaque création/mise à jour écrit désormais une entrée AuditLog complète
// (qui, quoi, avant/après), de façon ATOMIQUE avec le changement lui-même
// (même transaction) plutôt que deux écritures indépendantes.
describe("Audit log coverage for settings and cities (e2e)", () => {
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

  it("records an audit log entry with before/after values on settings.update", async () => {
    const before = await settings.get();
    const newValues = {
      vatRate: before.vatRate === 0.2 ? 0.14 : 0.2,
      loyaltyRedeemRate: 10,
      freeShippingThreshold: 400,
    };

    await settings.update(newValues, staffUserId);

    const log = await prisma.auditLog.findFirst({
      where: { action: "settings.update", entity: "SystemSetting" },
      orderBy: { createdAt: "desc" },
    });
    expect(log).not.toBeNull();
    expect(log?.staffUserId).toBe(staffUserId);
    expect((log?.oldValue as { vatRate: number })?.vatRate).toBe(before.vatRate);
    expect((log?.newValue as { vatRate: number })?.vatRate).toBe(newValues.vatRate);

    // Restaure les paramètres globaux pour ne pas affecter d'autres tests.
    await settings.update(before, staffUserId);
    await prisma.auditLog.deleteMany({ where: { action: "settings.update" } });
  });

  it("records an audit log entry on city creation, atomically with the write itself", async () => {
    const name = `Ville Audit ${Date.now()}`;
    const created = await cities.create({ name, shippingFee: 25 } as never, staffUserId);

    const log = await prisma.auditLog.findFirst({ where: { action: "city.create", entity: "City", entityId: created.id } });
    expect(log).not.toBeNull();
    expect(log?.staffUserId).toBe(staffUserId);
    expect((log?.newValue as { shippingFee: number })?.shippingFee).toBe(25);

    await prisma.auditLog.deleteMany({ where: { entity: "City", entityId: created.id } });
    await prisma.city.delete({ where: { id: created.id } });
  });

  it("records old/new values on city update", async () => {
    const name = `Ville Audit Update ${Date.now()}`;
    const created = await cities.create({ name, shippingFee: 25 } as never, staffUserId);
    await cities.update(created.id, { name, shippingFee: 40 } as never, staffUserId);

    const log = await prisma.auditLog.findFirst({ where: { action: "city.update", entity: "City", entityId: created.id } });
    expect(log).not.toBeNull();
    expect((log?.oldValue as { shippingFee: number })?.shippingFee).toBe(25);
    expect((log?.newValue as { shippingFee: number })?.shippingFee).toBe(40);

    await prisma.auditLog.deleteMany({ where: { entity: "City", entityId: created.id } });
    await prisma.city.delete({ where: { id: created.id } });
  });

  it("does not persist the city write when it fails (duplicate name) — no orphan audit entry either", async () => {
    const name = `Ville Audit Conflict ${Date.now()}`;
    const created = await cities.create({ name, shippingFee: 25 } as never, staffUserId);

    await expect(cities.create({ name, shippingFee: 99 } as never, staffUserId)).rejects.toThrow();

    const logsForConflict = await prisma.auditLog.findMany({
      where: { action: "city.create", newValue: { path: ["shippingFee"], equals: 99 } },
    });
    expect(logsForConflict).toHaveLength(0);

    await prisma.auditLog.deleteMany({ where: { entity: "City", entityId: created.id } });
    await prisma.city.delete({ where: { id: created.id } });
  });
});
