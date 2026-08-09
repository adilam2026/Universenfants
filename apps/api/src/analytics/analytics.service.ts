import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary() {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [orders, orderLines, ordersByStatusRaw] = await Promise.all([
      this.prisma.order.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true, total: true, status: true },
        orderBy: { createdAt: "asc" },
      }),
      // Sans le filtre sur order.createdAt, "meilleures ventes" agrégeait sur
      // tout l'historique des commandes (incohérent avec le reste du tableau
      // de bord, limité à 30 jours) et son coût grossit indéfiniment avec le
      // volume de commandes au fil des années au lieu de rester borné.
      this.prisma.orderLine.groupBy({
        by: ["productNameSnapshot"],
        where: { order: { createdAt: { gte: since } } },
        _sum: { quantity: true, lineTotal: true },
        orderBy: { _sum: { lineTotal: "desc" } },
        take: 5,
      }),
      // Sans le même filtre createdAt que les deux requêtes ci-dessus, cette
      // répartition portait sur tout l'historique alors que la page est
      // explicitement labellée "30 derniers jours" — incohérente avec le
      // CA et le nombre de commandes affichés juste au-dessus.
      this.prisma.order.groupBy({ by: ["status"], where: { createdAt: { gte: since } }, _count: { _all: true } }),
    ]);

    // Les 30 jours sont tous représentés (même à 0) pour que le graphique
    // reflète une vraie tendance plutôt que les seuls jours avec commandes.
    const revenueByDayMap = new Map<string, number>();
    for (let d = new Date(since); d <= new Date(); d.setDate(d.getDate() + 1)) {
      revenueByDayMap.set(d.toISOString().slice(0, 10), 0);
    }
    // Une commande annulée n'est jamais du chiffre d'affaires.
    const billable = orders.filter((o) => o.status !== "CANCELLED");
    for (const o of billable) {
      const day = o.createdAt.toISOString().slice(0, 10);
      revenueByDayMap.set(day, (revenueByDayMap.get(day) ?? 0) + Number(o.total));
    }
    const revenueByDay = Array.from(revenueByDayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, revenue]) => ({ date, revenue }));

    const totalRevenue = billable.reduce((s, o) => s + Number(o.total), 0);
    const totalOrders = orders.length;

    return {
      totalRevenue,
      totalOrders,
      // totalRevenue exclut les commandes annulées (billable) — diviser par
      // totalOrders (qui les inclut) sous-estimait le panier moyen dès qu'il
      // y avait ne serait-ce qu'une annulation dans les 30 derniers jours.
      avgOrderValue: billable.length > 0 ? Math.round(totalRevenue / billable.length) : 0,
      revenueByDay,
      topProducts: orderLines.map((l) => ({
        name: l.productNameSnapshot,
        quantity: l._sum.quantity ?? 0,
        revenue: Number(l._sum.lineTotal ?? 0),
      })),
      ordersByStatus: Object.fromEntries(ordersByStatusRaw.map((s) => [s.status, s._count._all])),
    };
  }
}
