import { apiFetch } from "./api-client";

export interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  oldValue: unknown;
  newValue: unknown;
  ipAddress: string | null;
  createdAt: string;
  staffUser: { id: string; name: string; email: string } | null;
}

export interface AuditLogPage {
  items: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
}

export function listAuditLogs(filters: { entity?: string; action?: string; page?: number } = {}) {
  const params = new URLSearchParams();
  if (filters.entity) params.set("entity", filters.entity);
  if (filters.action) params.set("action", filters.action);
  if (filters.page) params.set("page", String(filters.page));
  const query = params.toString();
  return apiFetch<AuditLogPage>(`/audit-logs${query ? `?${query}` : ""}`);
}
