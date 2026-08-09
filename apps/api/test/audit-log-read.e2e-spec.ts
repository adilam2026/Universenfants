import { Test } from "@nestjs/testing";
import type { INestApplicationContext } from "@nestjs/common";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { AuditLogService } from "../src/common/audit-log.service";

// AuditLogService écrivait déjà des entrées (coupons, promotions,
// paramètres, villes, connexions staff...) mais rien ne les lisait jamais —
// aucun endpoint, aucune page admin. Ces tests couvrent le nouveau
// list()/GET /audit-logs (pagination + filtres entité/action).
describe("Audit log read path (e2e)", () => {
  let app: INestApplicationContext;
  let prisma: PrismaService;
  let auditLog: AuditLogService;

  let staffUserId: string;
  const entity = `TestEntity-${Date.now()}`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    auditLog = app.get(AuditLogService);

    const staff = await prisma.staffUser.findFirstOrThrow();
    staffUserId = staff.id;

    await auditLog.record({
      staffUserId,
      action: "test.create",
      entity,
      entityId: "entity-1",
      newValue: { foo: "bar" },
    });
    await auditLog.record({
      staffUserId,
      action: "test.update",
      entity,
      entityId: "entity-1",
      oldValue: { foo: "bar" },
      newValue: { foo: "baz" },
    });
  }, 30_000);

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { entity } });
    await app.close();
  }, 30_000);

  it("lists entries filtered by entity, newest first, with the acting staff user included", async () => {
    const result = await auditLog.list({ entity });
    expect(result.total).toBe(2);
    expect(result.items).toHaveLength(2);
    expect(result.items[0].action).toBe("test.update"); // le plus récent en premier
    expect(result.items[0].staffUser?.id).toBe(staffUserId);
    expect(result.items[1].action).toBe("test.create");
  });

  it("filters by action (case-insensitive contains)", async () => {
    const result = await auditLog.list({ entity, action: "UPDATE" });
    expect(result.total).toBe(1);
    expect(result.items[0].action).toBe("test.update");
  });

  it("paginates correctly", async () => {
    const page1 = await auditLog.list({ entity, page: 1, limit: 1 });
    expect(page1.items).toHaveLength(1);
    expect(page1.total).toBe(2);
    const page2 = await auditLog.list({ entity, page: 2, limit: 1 });
    expect(page2.items).toHaveLength(1);
    expect(page1.items[0].id).not.toBe(page2.items[0].id);
  });
});
