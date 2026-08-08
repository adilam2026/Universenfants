export const STORAGE_SERVICE = "STORAGE_SERVICE";

export interface UploadResult {
  url: string;
  key: string;
}

export interface StorageProvider {
  upload(key: string, buffer: Buffer, contentType: string): Promise<UploadResult>;
  delete(key: string): Promise<void>;
}
