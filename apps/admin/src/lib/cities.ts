import { apiFetch } from "./api-client";

export interface AdminCity {
  id: string;
  name: string;
  shippingFee: string;
  freeShippingFrom: string | null;
  active: boolean;
  groupId: string | null;
  group: { name: string } | null;
}

export interface UpsertCityPayload {
  name: string;
  shippingFee: number;
  freeShippingFrom?: number;
  active?: boolean;
  groupId?: string | null;
}

export const listCities = () => apiFetch<AdminCity[]>("/cities");
export const createCity = (payload: UpsertCityPayload) =>
  apiFetch<AdminCity>("/cities", { method: "POST", body: JSON.stringify(payload) });
export const updateCity = (id: string, payload: UpsertCityPayload) =>
  apiFetch<AdminCity>(`/cities/${id}`, { method: "PATCH", body: JSON.stringify(payload) });

export interface AdminCityGroup {
  id: string;
  name: string;
  shippingFee: string;
  freeShippingFrom: string | null;
  cities: { id: string; name: string }[];
}

export interface UpsertCityGroupPayload {
  name: string;
  shippingFee: number;
  freeShippingFrom?: number;
}

export const listCityGroups = () => apiFetch<AdminCityGroup[]>("/city-groups");
export const createCityGroup = (payload: UpsertCityGroupPayload) =>
  apiFetch<AdminCityGroup>("/city-groups", { method: "POST", body: JSON.stringify(payload) });
export const updateCityGroup = (id: string, payload: UpsertCityGroupPayload) =>
  apiFetch<AdminCityGroup>(`/city-groups/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
export const removeCityGroup = (id: string) => apiFetch<{ ok: boolean }>(`/city-groups/${id}`, { method: "DELETE" });
