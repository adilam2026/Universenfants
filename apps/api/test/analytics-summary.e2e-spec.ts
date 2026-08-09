import { Test } from "@nestjs/testing";
import type { INestApplicationContext } from "@nestjs/common";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { AnalyticsService } from "../src/analytics/analytics.service";

// analytics.service.ts#summary avait deux incohérences avec son propre
// libellé "30 derniers jours" :
// 1. avgOrderValue divisait totalRevenue (qui exclut les commandes
//    annulées) par totalOrders (qui les inclut) — sous-estimant le panier
//    moyen dès qu'il y avait une annulation dans la fenêtre.
// 2. ordersByStatus n'appliquait aucun filtre createdAt, contrairement aux
//    deux autres requêtes du même résumé — portait sur tout l'historique.
describe("Analytics summary (e2e)", () => {
  let app: INestApplicationContext;
  let prisma: PrismaService;
  let analytics: AnalyticsService;

  let customerId: string;
  const orderIds: string[] = [];
  const suffix = Date.now();

  async function makeOrder(total: number, status: "PENDING" | "DELIVERED" | "CANCELLED", createdAt: Date) {
    const order = await prisma.order.create({
      data: {
        orderNumber: `UE-TEST-ANALYTICS-${suffix}-${orderIds.length}`,
        customerId,
        subtotal: total,
        shippingFee: 0,
        vatAmount: 0,
        total,
        shippingCity: "Casablanca",
        shippingAddress: "1 rue test",
        shippingPhone: "0600000000",
        status,
        createdAt,
      },
    });
    orderIds.push(order.id);
    return order;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    analytics = app.get(AnalyticsService);

    const customer = await prisma.customer.create({
      data: { firstName: "Test", lastName: "Analytics", phone: `analytics-${suffix}` },
    });
    customerId = customer.id;

    const now = new Date();
    const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

    // Fenêtre 30 jours : deux commandes facturables + une annulée.
    await makeOrder(100, "DELIVERED", daysAgo(1));
    await makeOrder(200, "PENDING", daysAgo(2));
    await makeOrder(9999, "CANCELLED", daysAgo(3));
    // Hors fenêtre (40 jours) : ne doit compter dans rien.
    await makeOrder(500, "DELIVERED", daysAgo(40));
  }, 30_000);

  afterAll(async () => {
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.customer.delete({ where: { id: customerId } });
    await app.close();
  }, 30_000);

  it("computes avgOrderValue over billable (non-cancelled) orders only, not all orders", async () => {
    const result = await analytics.summary();
    // Panier moyen attendu sur CE jeu de données : (100+200)/2 = 150 — jamais
    // en incluant la commande annulée dans le diviseur.
    // (D'autres commandes peuvent exister en base d'autres tests/seed — on
    // vérifie donc la propriété structurelle plutôt qu'une valeur absolue.)
    const expectedAvg = Math.round(result.totalRevenue / (result.totalOrders - (result.ordersByStatus.CANCELLED ?? 0)));
    expect(result.avgOrderValue).toBe(expectedAvg);
  });

  it("restricts ordersByStatus to the same 30-day window as the rest of the summary", async () => {
    const before = await prisma.order.groupBy({ by: ["status"], _count: { _all: true } });
    const totalAllTime = before.reduce((s, b) => s + b._count._all, 0);

    const result = await analytics.summary();
    const totalInWindow = Object.values(result.ordersByStatus).reduce((s, n) => s + n, 0);

    // La commande vieille de 40 jours ne doit pas être comptée : le total
    // "fenêtré" doit rester strictement inférieur au total toutes commandes
    // confondues (qui, lui, inclut la commande hors fenêtre créée ci-dessus).
    expect(totalInWindow).toBeLessThan(totalAllTime);
  });
});
