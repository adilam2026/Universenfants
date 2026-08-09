import { Test } from "@nestjs/testing";
import type { INestApplicationContext } from "@nestjs/common";
import type { Request } from "express";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { StaffAuthService } from "../src/auth/staff-auth.service";
import { hashPassword } from "../src/auth/password.util";

// admin-shell.tsx affichait tous les modules du Back-Office à n'importe quel
// membre du staff authentifié, sans jamais consulter ses permissions
// réelles — l'application ne le refusait qu'à la soumission d'une action
// (403). Le login renvoie désormais l'ensemble de permissions déjà résolu
// côté serveur (PermissionsGuard) pour que la sidebar/les pages puissent
// masquer/désactiver en conséquence.
describe("Staff login exposes effective permissions (e2e)", () => {
  let app: INestApplicationContext;
  let prisma: PrismaService;
  let staffAuth: StaffAuthService;

  const fakeReq = { ip: "127.0.0.1", socket: { remoteAddress: "127.0.0.1" } } as unknown as Request;

  let readOnlyRoleId: string;
  let readOnlyStaffId: string;
  let superAdminRoleId: string;
  let superAdminStaffId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    staffAuth = app.get(StaffAuthService);

    const readOnlyRole = await prisma.role.findFirstOrThrow({ where: { code: "READ_ONLY" } });
    readOnlyRoleId = readOnlyRole.id;
    const superAdminRole = await prisma.role.findFirstOrThrow({ where: { code: "SUPER_ADMIN" } });
    superAdminRoleId = superAdminRole.id;

    const readOnlyStaff = await prisma.staffUser.create({
      data: {
        name: "Test Lecture Seule",
        email: `staff-readonly-${Date.now()}@example.com`,
        passwordHash: await hashPassword("TestPass123!"),
        roleId: readOnlyRoleId,
        active: true,
      },
    });
    readOnlyStaffId = readOnlyStaff.id;

    const superAdminStaff = await prisma.staffUser.create({
      data: {
        name: "Test Super Admin",
        email: `staff-superadmin-${Date.now()}@example.com`,
        passwordHash: await hashPassword("TestPass123!"),
        roleId: superAdminRoleId,
        active: true,
      },
    });
    superAdminStaffId = superAdminStaff.id;
  }, 30_000);

  afterAll(async () => {
    await prisma.refreshToken.deleteMany({ where: { subjectId: { in: [readOnlyStaffId, superAdminStaffId] } } });
    await prisma.auditLog.deleteMany({ where: { staffUserId: { in: [readOnlyStaffId, superAdminStaffId] } } });
    await prisma.staffUser.deleteMany({ where: { id: { in: [readOnlyStaffId, superAdminStaffId] } } });
    await app.close();
  }, 30_000);

  it("a READ_ONLY staff member only gets its role's granted permissions, not settings.manage", async () => {
    const { user } = await staffAuth.login({ email: (await prisma.staffUser.findUniqueOrThrow({ where: { id: readOnlyStaffId } })).email, password: "TestPass123!" }, fakeReq);
    expect(user.permissions).toEqual(
      expect.arrayContaining(["product.read", "order.read", "customer.read", "analytics.read"]),
    );
    expect(user.permissions).not.toContain("settings.manage");
    expect(user.permissions).not.toContain("product.create");
  });

  it("a SUPER_ADMIN gets every permission, including settings.manage", async () => {
    const { user } = await staffAuth.login({ email: (await prisma.staffUser.findUniqueOrThrow({ where: { id: superAdminStaffId } })).email, password: "TestPass123!" }, fakeReq);
    expect(user.permissions).toContain("settings.manage");
    expect(user.permissions).toContain("product.create");
    expect(user.permissions).toContain("user.manage");
  });

  it("extraPermissions grants/restrictions are reflected on top of the role's defaults", async () => {
    const settingsPermission = await prisma.permission.findFirstOrThrow({ where: { code: "settings.manage" } });
    const readOnlyStaff = await prisma.staffUser.findUniqueOrThrow({ where: { id: readOnlyStaffId } });

    await prisma.staffUserPermission.create({
      data: { staffUserId: readOnlyStaff.id, permissionId: settingsPermission.id, granted: true },
    });

    const { user } = await staffAuth.login({ email: readOnlyStaff.email, password: "TestPass123!" }, fakeReq);
    expect(user.permissions).toContain("settings.manage");

    await prisma.staffUserPermission.deleteMany({ where: { staffUserId: readOnlyStaff.id } });
  });
});
