import { apiFetch } from "./api-client";

export interface AdminSettings {
  vatRate: number;
  loyaltyRedeemRate: number;
  freeShippingThreshold: number;
}

export const getSettings = () => apiFetch<AdminSettings>("/settings");
export const updateSettings = (payload: AdminSettings) =>
  apiFetch<AdminSettings>("/settings", { method: "PUT", body: JSON.stringify(payload) });
