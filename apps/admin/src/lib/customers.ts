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

export const listCustomers = () => apiFetch<AdminCustomerSummary[]>("/customers");
export const getCustomer = (id: string) => apiFetch<AdminCustomerDetail>(`/customers/${id}`);
