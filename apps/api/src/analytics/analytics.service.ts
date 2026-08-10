import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const DEFAULT_DAYS = 30;
const MAX_DAYS = 365;

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(daysParam?: number) {
    const days = Math.min(MAX_DAYS, Math.max(1, Math.trunc(daysParam ?? DEFAULT_DAYS) || DEFAULT_DAYS));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    // Période précédente de même durée, immédiatement avant `since` — sert
    // de référence pour les variations en % (ex: "+12% vs période précédente")
    // plutôt que des chiffres bruts sans point de comparaison.
    const previousSince = new Date(since.getTime() - days * 24 * 60 * 60 * 1000);

    const [orders, orderLines, ordersByStatusRaw, previousOrders, newCustomers] = await Promise.all([
      this.prisma.order.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true, total: true, status: true },
        orderBy: { createdAt: "asc" },
      }),
      // Sans le filtre sur order.createdAt, "meilleures ventes" agrégeait sur
      // tout l'historique des commandes (incohérent avec le reste du tableau
      // de bord, limité à la période choisie) et son coût grossit indéfiniment
      // avec le volume de commandes au fil des années au lieu de rester borné.
      this.prisma.orderLine.groupBy({
        by: ["productNameSnapshot"],
        where: { order: { createdAt: { gte: since } } },
        _sum: { quantity: true, lineTotal: true },
        orderBy: { _sum: { lineTotal: "desc" } },
        take: 5,
      }),
      // Sans le même filtre createdAt que les deux requêtes ci-dessus, cette
      // répartition portait sur tout l'historique alors que la page est
      // explicitement filtrée sur une période — incohérente avec le CA et le
      // nombre de commandes affichés juste au-dessus.
      this.prisma.order.groupBy({ by: ["status"], where: { createdAt: { gte: since } }, _count: { _all: true } }),
      this.prisma.order.findMany({
        where: { createdAt: { gte: previousSince, lt: since } },
        select: { total: true, status: true },
      }),
      this.prisma.customer.count({ where: { createdAt: { gte: since } } }),
    ]);

    // Tous les jours de la période sont représentés (même à 0) pour que le
    // graphique reflète une vraie tendance plutôt que les seuls jours avec
    // commandes.
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

    const previousBillable = previousOrders.filter((o) => o.status !== "CANCELLED");
    const previousRevenue = previousBillable.reduce((s, o) => s + Number(o.total), 0);
    const previousOrderCount = previousOrders.length;

    const totalItems = orderLines.reduce((s, l) => s + (l._sum.quantity ?? 0), 0);

    return {
      days,
      totalRevenue,
      totalOrders,
      // totalRevenue exclut les commandes annulées (billable) — diviser par
      // totalOrders (qui les inclut) sous-estimait le panier moyen dès qu'il
      // y avait ne serait-ce qu'une annulation dans la période.
      avgOrderValue: billable.length > 0 ? Math.round(totalRevenue / billable.length) : 0,
      // Basé sur les 5 meilleures ventes seulement (voir orderLines
      // ci-dessus, borné à `take: 5`) — un ordre de grandeur, pas une
      // moyenne exacte sur toutes les commandes.
      avgItemsPerOrder: billable.length > 0 ? Math.round((totalItems / billable.length) * 10) / 10 : 0,
      newCustomers,
      revenueByDay,
      topProducts: orderLines.map((l) => ({
        name: l.productNameSnapshot,
        quantity: l._sum.quantity ?? 0,
        revenue: Number(l._sum.lineTotal ?? 0),
      })),
      ordersByStatus: Object.fromEntries(ordersByStatusRaw.map((s) => [s.status, s._count._all])),
      comparison: {
        revenueChangePct: percentChange(previousRevenue, totalRevenue),
        ordersChangePct: percentChange(previousOrderCount, totalOrders),
      },
    };
  }
}

/** null quand il n'y a rien à comparer (période précédente vide) — afficher
 * "+∞%" ou "0%" serait trompeur, mieux vaut ne rien afficher côté client. */
function percentChange(previous: number, current: number): number | null {
  if (previous <= 0) return current > 0 ? null : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
