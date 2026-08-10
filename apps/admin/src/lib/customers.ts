import { apiFetch, type Paginated } from "./api-client";

export interface AdminCustomerSummary {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  ordersCount: number;
  totalSpent: string;
  createdAt: string;
}

export interface LoyaltyTransactionEntry {
  id: string;
  type: "EARN" | "REDEEM" | "CANCEL" | "EXPIRE";
  points: number;
  reason: string | null;
  createdAt: string;
  order: { orderNumber: string } | null;
}

export interface AdminCustomerDetail extends AdminCustomerSummary {
  orders: { id: string; orderNumber: string; status: string; total: string; createdAt: string }[];
  loyaltyAccount: { pointsBalance: number; transactions: LoyaltyTransactionEntry[] } | null;
  addresses: { id: string; label: string | null; city: string; addressLine: string }[];
}

export interface CustomerListFilters {
  q?: string;
  page?: number;
  limit?: number;
}

export function customerListKey(filters: CustomerListFilters = {}) {
  const qs = new URLSearchParams();
  if (filters.q) qs.set("q", filters.q);
  if (filters.page && filters.page > 1) qs.set("page", String(filters.page));
  if (filters.limit) qs.set("limit", String(filters.limit));
  const query = qs.toString();
  return `/customers${query ? `?${query}` : ""}`;
}

export const listCustomers = (filters: CustomerListFilters = {}) => apiFetch<Paginated<AdminCustomerSummary>>(customerListKey(filters));
export const getCustomer = (id: string) => apiFetch<AdminCustomerDetail>(`/customers/${id}`);
