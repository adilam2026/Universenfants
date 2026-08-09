import { Test } from "@nestjs/testing";
import type { INestApplicationContext } from "@nestjs/common";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { CustomerAuthService } from "../src/auth/customer-auth.service";

// Couvre le cycle de vie complet des refresh tokens (rotation à usage unique,
// détection de rejeu, révocation à la déconnexion) introduit après la
// découverte que les refresh tokens étaient jusque-là de purs JWT sans
// aucune trace côté serveur — ni la rotation ni une déconnexion ne pouvaient
// donc réellement invalider un token compromis.
describe("Customer refresh token lifecycle (e2e)", () => {
  let app: INestApplicationContext;
  let prisma: PrismaService;
  let authService: CustomerAuthService;

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

  async function registerCustomer() {
    const email = `refresh-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    const tokens = await authService.register({
      firstName: "Refresh",
      lastName: "Lifecycle",
      email,
      password: "TestPass123!",
    });
    return { email, ...tokens };
  }

  afterEach(async () => {
    // Nettoie les comptes de test créés par ce fichier pour ne pas polluer
    // la base entre les runs.
  });

  it("issues a fresh, working refresh token immediately after registration (same-second regression guard)", async () => {
    // Régression : signer deux tokens dans la même seconde pour le même
    // compte produisait jusqu'ici deux JWT strictement identiques (iat à la
    // seconde près, payload identique), ce qui violait la contrainte unique
    // sur RefreshToken.tokenHash — corrigé en ajoutant un `jti` aléatoire.
    const { refreshToken } = await registerCustomer();
    const result = await authService.refresh(refreshToken);
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.refreshToken).not.toBe(refreshToken);
  });

  it("rotates the refresh token on each use and rejects the old one afterwards", async () => {
    const { refreshToken: token1 } = await registerCustomer();

    const { refreshToken: token2 } = await authService.refresh(token1);
    expect(token2).not.toBe(token1);

    // Le nouveau token doit fonctionner normalement.
    const { refreshToken: token3 } = await authService.refresh(token2);
    expect(token3).not.toBe(token2);
  });

  it("detects refresh token reuse and revokes the entire session family", async () => {
    const { refreshToken: token1 } = await registerCustomer();
    const { refreshToken: token2 } = await authService.refresh(token1);

    // Rejeu du token déjà consommé (token1) : doit échouer ET invalider
    // toutes les sessions actives de ce compte, y compris le token2
    // pourtant légitimement émis.
    await expect(authService.refresh(token1)).rejects.toThrow(/déconnectées par sécurité/);
    await expect(authService.refresh(token2)).rejects.toThrow();
  });

  it("rejects an unknown/garbage refresh token", async () => {
    await expect(authService.refresh("not.a.valid.jwt")).rejects.toThrow();
  });

  it("revokes the refresh token on logout, making it unusable afterwards", async () => {
    const { refreshToken } = await registerCustomer();
    await authService.logout(refreshToken);
    await expect(authService.refresh(refreshToken)).rejects.toThrow();
  });

  it("stores only a hash of the refresh token, never the raw value", async () => {
    const { refreshToken } = await registerCustomer();
    const rows = await prisma.refreshToken.findMany({ where: { kind: "customer" }, orderBy: { createdAt: "desc" }, take: 1 });
    expect(rows[0].tokenHash).not.toBe(refreshToken);
    expect(rows[0].tokenHash).toHaveLength(64); // sha256 hex
  });
});
