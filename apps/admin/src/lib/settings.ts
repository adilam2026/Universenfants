import { apiFetch } from "./api-client";

export interface AdminSettings {
  vatRate: number;
  loyaltyRedeemRate: number;
  freeShippingThreshold: number;
  whatsappOrderNumber: string | null;
}

export const getSettings = () => apiFetch<AdminSettings>("/settings");
// L'API attend une chaîne (vide pour effacer), jamais `null` — le DTO
// distingue "champ absent" (@IsOptional, ne touche pas la valeur stockée) de
// "chaîne vide" (efface), et `null` échouerait la validation @IsString().
export const updateSettings = (payload: Omit<AdminSettings, "whatsappOrderNumber"> & { whatsappOrderNumber?: string }) =>
  apiFetch<AdminSettings>("/settings", { method: "PUT", body: JSON.stringify(payload) });
