import { Test } from "@nestjs/testing";
import type { INestApplicationContext } from "@nestjs/common";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { PromotionsService } from "../src/marketing/promotions/promotions.service";
import { CouponsService } from "../src/marketing/coupons/coupons.service";

// Sans validation de cohérence scope/id, une promotion CATEGORY/BRAND créée
// sans categoryId/brandId (faute de frappe côté admin, ou mauvais scope
// sélectionné) est acceptée en base mais n'a jamais d'effet sur aucun prix —
// exactement le bug de fonctionnalité déconnectée signalé sur Promotions.
// Ces tests vérifient que promotions.service.ts et coupons.service.ts
// rejettent ces incohérences à la création/mise à jour plutôt que de les
// laisser échouer silencieusement au moment du calcul de prix, ainsi que la
// trace d'audit désormais associée à chaque création/mise à jour réussie.
describe("Promotion / coupon admin validation (e2e)", () => {
  let app: INestApplicationContext;
  let prisma: PrismaService;
  let promotions: PromotionsService;
  let coupons: CouponsService;

  let categoryId: string;
  let staffUserId: string;

  function window() {
    return {
      startAt: new Date(Date.now() - 86_400_000).toISOString(),
      endAt: new Date(Date.now() + 86_400_000).toISOString(),
    };
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    promotions = app.get(PromotionsService);
    coupons = app.get(CouponsService);

    const staff = await prisma.staffUser.findFirst();
    if (!staff) throw new Error("Aucun staff en base — lancer prisma:seed avant ce test");
    staffUserId = staff.id;

    const category = await prisma.category.create({
      data: { nameFr: "Test validation promo", slug: `test-promo-validation-${Date.now()}` },
    });
    categoryId = category.id;
  }, 30_000);

  afterAll(async () => {
    await prisma.category.delete({ where: { id: categoryId } });
    await app.close();
  }, 30_000);

  it("rejects a CATEGORY-scoped promotion with no categoryId", async () => {
    await expect(
      promotions.create(
        {
          name: "Promo sans catégorie",
          type: "PERCENTAGE",
          value: 10,
          scope: "CATEGORY",
          ...window(),
        } as never,
        staffUserId,
      ),
    ).rejects.toThrow(/doit préciser la catégorie/);
  });

  it("rejects a BRAND-scoped promotion with no brandId", async () => {
    await expect(
      promotions.create(
        {
          name: "Promo sans marque",
          type: "PERCENTAGE",
          value: 10,
          scope: "BRAND",
          ...window(),
        } as never,
        staffUserId,
      ),
    ).rejects.toThrow(/doit préciser la marque/);
  });

  it("rejects a promotion referencing a non-existent category", async () => {
    await expect(
      promotions.create(
        {
          name: "Promo catégorie fantôme",
          type: "PERCENTAGE",
          value: 10,
          scope: "CATEGORY",
          categoryId: "cnotexist00000000000000000",
          ...window(),
        } as never,
        staffUserId,
      ),
    ).rejects.toThrow(/Catégorie introuvable/);
  });

  it("rejects a percentage promotion above 100%", async () => {
    await expect(
      promotions.create(
        {
          name: "Promo 150%",
          type: "PERCENTAGE",
          value: 150,
          scope: "CATEGORY",
          categoryId,
          ...window(),
        } as never,
        staffUserId,
      ),
    ).rejects.toThrow(/ne peut pas dépasser 100/);
  });

  it("accepts a well-formed category promotion and records an audit log entry", async () => {
    const created = await promotions.create(
      {
        name: "Promo catégorie valide",
        type: "PERCENTAGE",
        value: 20,
        scope: "CATEGORY",
        categoryId,
        ...window(),
      } as never,
      staffUserId,
    );
    expect(created.categoryId).toBe(categoryId);

    const log = await prisma.auditLog.findFirst({
      where: { action: "promotion.create", entity: "Promotion", entityId: created.id },
    });
    expect(log).not.toBeNull();
    expect(log?.staffUserId).toBe(staffUserId);

    await prisma.auditLog.deleteMany({ where: { entity: "Promotion", entityId: created.id } });
    await prisma.promotion.delete({ where: { id: created.id } });
  });

  it("rejects a percentage coupon above 100%", async () => {
    await expect(
      coupons.create(
        {
          code: `OVER100-${Date.now()}`,
          type: "PERCENTAGE",
          value: 150,
          ...window(),
        } as never,
        staffUserId,
      ),
    ).rejects.toThrow(/ne peut pas dépasser 100/);
  });

  it("rejects creating a coupon with a code that already exists", async () => {
    const code = `DUPLICATE-${Date.now()}`;
    const first = await coupons.create({ code, type: "FIXED_AMOUNT", value: 10, ...window() } as never, staffUserId);

    await expect(
      coupons.create({ code, type: "FIXED_AMOUNT", value: 5, ...window() } as never, staffUserId),
    ).rejects.toThrow(/existe déjà/);

    await prisma.auditLog.deleteMany({ where: { entity: "Coupon", entityId: first.id } });
    await prisma.coupon.delete({ where: { id: first.id } });
  });

  it("records an audit log entry with old/new values on coupon update", async () => {
    const code = `AUDIT-${Date.now()}`;
    const created = await coupons.create({ code, type: "FIXED_AMOUNT", value: 10, ...window() } as never, staffUserId);
    const updated = await coupons.update(created.id, { code, type: "FIXED_AMOUNT", value: 25, ...window() } as never, staffUserId);
    expect(Number(updated.value)).toBe(25);

    const log = await prisma.auditLog.findFirst({
      where: { action: "coupon.update", entity: "Coupon", entityId: created.id },
    });
    expect(log).not.toBeNull();
    expect((log?.oldValue as { value: number })?.value).toBe(10);
    expect((log?.newValue as { value: number })?.value).toBe(25);

    await prisma.auditLog.deleteMany({ where: { entity: "Coupon", entityId: created.id } });
    await prisma.coupon.delete({ where: { id: created.id } });
  });
});
