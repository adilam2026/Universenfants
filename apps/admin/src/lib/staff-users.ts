import { apiFetch } from "./api-client";

export interface AdminStaffUser {
  id: string;
  name: string;
  email: string;
  active: boolean;
  lastLoginAt: string | null;
  role: { id: string; name: string; code: string };
}

export interface CreateStaffUserPayload {
  name: string;
  email: string;
  password: string;
  roleId: string;
}

export interface UpdateStaffUserPayload {
  name?: string;
  roleId?: string;
  active?: boolean;
}

export const listStaffUsers = () => apiFetch<AdminStaffUser[]>("/staff-users");
export const createStaffUser = (payload: CreateStaffUserPayload) =>
  apiFetch<AdminStaffUser>("/staff-users", { method: "POST", body: JSON.stringify(payload) });
export const updateStaffUser = (id: string, payload: UpdateStaffUserPayload) =>
  apiFetch<AdminStaffUser>(`/staff-users/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
export const resetStaffPassword = (id: string, newPassword: string) =>
  apiFetch<{ ok: boolean }>(`/staff-users/${id}/reset-password`, { method: "POST", body: JSON.stringify({ newPassword }) });

export interface AdminRole {
  id: string;
  code: string;
  name: string;
  permissions: { permission: { code: string } }[];
  _count: { staffUsers: number };
}

export interface PermissionOption {
  code: string;
  domain: string;
}

export const listRoles = () => apiFetch<AdminRole[]>("/roles");
export const listPermissionOptions = () => apiFetch<PermissionOption[]>("/roles/permissions");
export const createRole = (payload: { code: string; name: string; permissionCodes: string[] }) =>
  apiFetch<AdminRole>("/roles", { method: "POST", body: JSON.stringify(payload) });
export const updateRole = (id: string, payload: { name: string; permissionCodes: string[] }) =>
  apiFetch<AdminRole>(`/roles/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
export const removeRole = (id: string) => apiFetch<{ ok: boolean }>(`/roles/${id}`, { method: "DELETE" });
