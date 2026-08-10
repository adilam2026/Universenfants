import { apiFetch, getStaffToken, type Paginated } from "./api-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export interface AdminOrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: string;
  shippingCity: string;
  createdAt: string;
  customer: { firstName: string; lastName: string; phone: string | null; email: string | null };
}

export interface AdminOrderLine {
  id: string;
  productNameSnapshot: string;
  skuSnapshot: string;
  costPriceSnapshot: string;
  sellPriceSnapshot: string;
  quantity: number;
  lineTotal: string;
}

export interface AdminOrderStatusEntry {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  createdAt: string;
  staffUser: { name: string } | null;
}

export interface AdminOrderDetail extends AdminOrderSummary {
  subtotal: string;
  shippingFee: string;
  discount: string;
  loyaltyDiscount: string;
  vatAmount: string;
  paidAmount: string;
  shippingAddress: string;
  shippingPhone: string;
  lines: AdminOrderLine[];
  statusHistory: AdminOrderStatusEntry[];
}

export interface OrderListFilters {
  status?: string;
  city?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export function orderListKey(filters: OrderListFilters = {}) {
  const qs = new URLSearchParams();
  if (filters.status) qs.set("status", filters.status);
  if (filters.city) qs.set("city", filters.city);
  if (filters.q) qs.set("q", filters.q);
  if (filters.page && filters.page > 1) qs.set("page", String(filters.page));
  if (filters.limit) qs.set("limit", String(filters.limit));
  const query = qs.toString();
  return `/orders/admin/list${query ? `?${query}` : ""}`;
}

export const listAdminOrders = (filters: OrderListFilters = {}) => apiFetch<Paginated<AdminOrderSummary>>(orderListKey(filters));

export interface AdminOrderStats {
  totalOrders: number;
  pendingOrders: number;
  revenue: number;
}

export const getAdminOrderStats = () => apiFetch<AdminOrderStats>("/orders/admin/stats");

export const getAdminOrder = (id: string) => apiFetch<AdminOrderDetail>(`/orders/admin/${id}`);

export const updateOrderStatus = (id: string, status: string, note?: string) =>
  apiFetch<AdminOrderDetail>(`/orders/admin/${id}/status`, { method: "PATCH", body: JSON.stringify({ status, note }) });

export const recordOrderPayment = (id: string, amount: number) =>
  apiFetch<AdminOrderDetail>(`/orders/admin/${id}/payment`, { method: "POST", body: JSON.stringify({ amount }) });

export async function exportOrders(filters: { status?: string; city?: string } = {}) {
  const qs = new URLSearchParams();
  if (filters.status) qs.set("status", filters.status);
  if (filters.city) qs.set("city", filters.city);
  const query = qs.toString();
  const token = getStaffToken();
  const res = await fetch(`${API_URL}/orders/admin/export${query ? `?${query}` : ""}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error(`Erreur (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `commandes-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
