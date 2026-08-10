import { apiFetch, getStaffToken } from "./api-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
// Plus long que le timeout par défaut (10s) : un import Excel volumineux
// traite les lignes une à une côté API et peut légitimement prendre du temps.
const UPLOAD_TIMEOUT_MS = 60_000;

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
    signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Erreur (${res.status})`);
  }
  return res.json() as Promise<ImportSummary>;
}

export interface ImportLogEntry {
  id: string;
  fileName: string | null;
  createdCount: number;
  updatedCount: number;
  errorCount: number;
  createdAt: string;
  staffUser: { name: string } | null;
}

export const listImportHistory = () => apiFetch<ImportLogEntry[]>("/products/admin/import-history");

export async function exportCatalog() {
  const token = getStaffToken();
  const res = await fetch(`${API_URL}/products/admin/export`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Erreur (${res.status})`);
  const blob = await res.blob();
  downloadBlob(blob, `catalogue-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
