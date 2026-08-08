import { apiFetch } from "./api-client";

export interface AdminReview {
  id: string;
  rating: number;
  comment: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminReply: string | null;
  createdAt: string;
  product: { nameFr: string; seoUrl: string };
  customer: { firstName: string | null; lastName: string | null };
}

export const listReviews = (status?: string) =>
  apiFetch<AdminReview[]>(`/reviews/admin${status ? `?status=${status}` : ""}`);

export const moderateReview = (id: string, status: "APPROVED" | "REJECTED", adminReply?: string) =>
  apiFetch<AdminReview>(`/reviews/admin/${id}`, { method: "PATCH", body: JSON.stringify({ status, adminReply }) });
