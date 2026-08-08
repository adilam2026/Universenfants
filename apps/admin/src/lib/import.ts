import { getStaffToken } from "./api-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export interface ImportRowResult {
  row: number;
  sku: string;
  status: "created" | "updated" | "error";
  message?: string;
}

export interface ImportSummary {
  results: ImportRowResult[];
  created: number;
  updated: number;
  errors: number;
}

export async function importProductsExcel(file: File): Promise<ImportSummary> {
  const formData = new FormData();
  formData.append("file", file);
  const token = getStaffToken();
  const res = await fetch(`${API_URL}/products/import`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Erreur (${res.status})`);
  }
  return res.json() as Promise<ImportSummary>;
}
