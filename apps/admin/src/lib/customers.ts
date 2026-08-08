import { apiFetch } from "./api-client";

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

export interface AdminCustomerDetail extends AdminCustomerSummary {
  orders: { id: string; orderNumber: string; status: string; total: string; createdAt: string }[];
  loyaltyAccount: { pointsBalance: number } | null;
  addresses: { id: string; label: string | null; city: string; addressLine: string }[];
}

export const listCustomers = () => apiFetch<AdminCustomerSummary[]>("/customers");
export const getCustomer = (id: string) => apiFetch<AdminCustomerDetail>(`/customers/${id}`);
