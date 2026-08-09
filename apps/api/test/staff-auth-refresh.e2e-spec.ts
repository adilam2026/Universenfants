import { Test } from "@nestjs/testing";
import type { INestApplicationContext } from "@nestjs/common";
import type { Request } from "express";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { StaffAuthService } from "../src/auth/staff-auth.service";
import { hashPassword } from "../src/auth/password.util";

// Même correctif que customer-auth.service.ts#refresh (auth-refresh.e2e-spec.ts) :
// staff-auth.service.ts#refresh partageait la même absence de verrou de ligne
// sur RefreshToken, particulièrement sensible côté staff puisqu'un jeton
// compromis y donne accès au Back-Office.
describe("Staff refresh token concurrency (e2e)", () => {
  let app: INestApplicationContext;
  let prisma: PrismaService;
  let staffAuth: StaffAuthService;

  let roleId: string;
  let staffUserId: string;

  const fakeReq = { ip: "127.0.0.1", socket: { remoteAddress: "127.0.0.1" } } as unknown as Request;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    staffAuth = app.get(StaffAuthService);

    const role = await prisma.role.findFirst({ where: { code: "SUPER_ADMIN" } });
    if (!role) throw new Error("Rôle SUPER_ADMIN introuvable — lancer prisma:seed avant ce test");
    roleId = role.id;

    const staff = await prisma.staffUser.create({
      data: {
        name: "Test Refresh Race",
        email: `staff-refresh-race-${Date.now()}@example.com`,
        passwordHash: await hashPassword("TestPass123!"),
        roleId,
        active: true,
      },
    });
    staffUserId = staff.id;
  }, 30_000);

  afterAll(async () => {
    await prisma.refreshToken.deleteMany({ where: { subjectId: staffUserId } });
    await prisma.auditLog.deleteMany({ where: { staffUserId } });
    await prisma.staffUser.delete({ where: { id: staffUserId } });
    await app.close();
  }, 30_000);

  it("only lets one of two truly concurrent refreshes of the same staff token succeed (TOCTOU race)", async () => {
    const { refreshToken } = await staffAuth.login(
      { email: (await prisma.staffUser.findUniqueOrThrow({ where: { id: staffUserId } })).email, password: "TestPass123!" },
      fakeReq,
    );

    const results = await Promise.allSettled([staffAuth.refresh(refreshToken), staffAuth.refresh(refreshToken)]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
  });
});
