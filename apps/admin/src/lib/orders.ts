import { apiFetch } from "./api-client";

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

export const listAdminOrders = (filters: { status?: string; city?: string } = {}) => {
  const qs = new URLSearchParams();
  if (filters.status) qs.set("status", filters.status);
  if (filters.city) qs.set("city", filters.city);
  const query = qs.toString();
  return apiFetch<AdminOrderSummary[]>(`/orders/admin/list${query ? `?${query}` : ""}`);
};

export const getAdminOrder = (id: string) => apiFetch<AdminOrderDetail>(`/orders/admin/${id}`);

export const updateOrderStatus = (id: string, status: string, note?: string) =>
  apiFetch<AdminOrderDetail>(`/orders/admin/${id}/status`, { method: "PATCH", body: JSON.stringify({ status, note }) });

export const recordOrderPayment = (id: string, amount: number) =>
  apiFetch<AdminOrderDetail>(`/orders/admin/${id}/payment`, { method: "POST", body: JSON.stringify({ amount }) });
