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
      this.prisma.orderLine.groupBy({
        by: ["productNameSnapshot"],
        _sum: { quantity: true, lineTotal: true },
        orderBy: { _sum: { lineTotal: "desc" } },
        take: 5,
      }),
      this.prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
    ]);

    // Les 30 jours sont tous représentés (même à 0) pour que le graphique
    // reflète une vraie tendance plutôt que les seuls jours avec commandes.
    const revenueByDayMap = new Map<string, number>();
    for (let d = new Date(since); d <= new Date(); d.setDate(d.getDate() + 1)) {
      revenueByDayMap.set(d.toISOString().slice(0, 10), 0);
    }
    for (const o of orders) {
      const day = o.createdAt.toISOString().slice(0, 10);
      revenueByDayMap.set(day, (revenueByDayMap.get(day) ?? 0) + Number(o.total));
    }
    const revenueByDay = Array.from(revenueByDayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, revenue]) => ({ date, revenue }));

    const totalRevenue = orders.reduce((s, o) => s + Number(o.total), 0);
    const totalOrders = orders.length;

    return {
      totalRevenue,
      totalOrders,
      avgOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
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
