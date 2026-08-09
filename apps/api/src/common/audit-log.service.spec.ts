import { Prisma } from "@prisma/client";
import { AuditLogService } from "./audit-log.service";

// Prisma.Decimal implémente toJSON() (renvoie une chaîne), qui s'exécute
// avant tout replacer JSON.stringify — sans la normalisation récursive de
// AuditLogService, un champ Decimal fini en chaîne côté oldValue (construit
// depuis une ligne Prisma brute) mais en nombre côté newValue (construit
// depuis un DTO déjà validé), rendant l'entrée d'audit incohérente.
describe("AuditLogService", () => {
  function fakePrisma() {
    const create = jest.fn((args: unknown) => Promise.resolve(args));
    return { auditLog: { create } } as unknown as import("../prisma/prisma.service").PrismaService;
  }

  it("converts a top-level Decimal field to a plain number", async () => {
    const prisma = fakePrisma();
    const service = new AuditLogService(prisma);
    await service.record({
      staffUserId: "staff1",
      action: "test.action",
      entity: "Test",
      entityId: "1",
      oldValue: { shippingFee: new Prisma.Decimal("25") },
    });
    const call = (prisma.auditLog.create as jest.Mock).mock.calls[0][0];
    expect(call.data.oldValue).toEqual({ shippingFee: 25 });
    expect(typeof call.data.oldValue.shippingFee).toBe("number");
  });

  it("converts nested Decimal fields inside arrays and objects", async () => {
    const prisma = fakePrisma();
    const service = new AuditLogService(prisma);
    await service.record({
      staffUserId: "staff1",
      action: "test.action",
      entity: "Test",
      entityId: "1",
      newValue: { lines: [{ amount: new Prisma.Decimal("99.5") }], nested: { total: new Prisma.Decimal("10") } },
    });
    const call = (prisma.auditLog.create as jest.Mock).mock.calls[0][0];
    expect(call.data.newValue).toEqual({ lines: [{ amount: 99.5 }], nested: { total: 10 } });
  });

  it("keeps oldValue/newValue undefined instead of stored as null when not provided", async () => {
    const prisma = fakePrisma();
    const service = new AuditLogService(prisma);
    await service.record({ staffUserId: "staff1", action: "test.action", entity: "Test", entityId: "1" });
    const call = (prisma.auditLog.create as jest.Mock).mock.calls[0][0];
    expect(call.data.oldValue).toBeUndefined();
    expect(call.data.newValue).toBeUndefined();
  });

  it("converts Date values to ISO strings", async () => {
    const prisma = fakePrisma();
    const service = new AuditLogService(prisma);
    const date = new Date("2026-01-01T00:00:00.000Z");
    await service.record({ staffUserId: "staff1", action: "test.action", entity: "Test", entityId: "1", newValue: { startAt: date } });
    const call = (prisma.auditLog.create as jest.Mock).mock.calls[0][0];
    expect(call.data.newValue).toEqual({ startAt: "2026-01-01T00:00:00.000Z" });
  });
});
