import { apiFetch } from "./api-client";

export interface AnalyticsSummary {
  days: number;
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  avgItemsPerOrder: number;
  newCustomers: number;
  totalMargin: number;
  marginRate: number;
  conversion: { productViews: number; viewSessions: number; conversionRatePct: number | null };
  topWishlisted: { name: string; count: number }[];
  loyalty: { pointsEarned: number; pointsRedeemed: number };
  revenueByDay: { date: string; revenue: number }[];
  topProducts: { name: string; quantity: number; revenue: number }[];
  ordersByStatus: Record<string, number>;
  comparison: { revenueChangePct: number | null; ordersChangePct: number | null };
}

export const getAnalyticsSummary = (days: number) => apiFetch<AnalyticsSummary>(`/analytics/summary?days=${days}`);
