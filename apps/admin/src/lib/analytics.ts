import { apiFetch } from "./api-client";

export interface AnalyticsSummary {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  revenueByDay: { date: string; revenue: number }[];
  topProducts: { name: string; quantity: number; revenue: number }[];
  ordersByStatus: Record<string, number>;
}

export const getAnalyticsSummary = () => apiFetch<AnalyticsSummary>("/analytics/summary");
