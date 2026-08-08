import { apiFetch } from "./api-client";

export interface AdminCity {
  id: string;
  name: string;
  shippingFee: string;
  freeShippingFrom: string | null;
  active: boolean;
  group: { name: string } | null;
}

export interface UpsertCityPayload {
  name: string;
  shippingFee: number;
  freeShippingFrom?: number;
  active?: boolean;
}

export const listCities = () => apiFetch<AdminCity[]>("/cities");
export const createCity = (payload: UpsertCityPayload) =>
  apiFetch<AdminCity>("/cities", { method: "POST", body: JSON.stringify(payload) });
export const updateCity = (id: string, payload: UpsertCityPayload) =>
  apiFetch<AdminCity>(`/cities/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
