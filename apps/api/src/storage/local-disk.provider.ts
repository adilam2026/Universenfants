import { mkdir, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { StorageProvider, UploadResult } from "./storage.constants";

// Résolu depuis ce fichier (pas process.cwd(), qui dépend du répertoire de
// lancement du process) pour toujours pointer vers apps/api/uploads, quel
// que soit l'endroit d'où `node dist/main.js` est démarré.
const UPLOADS_DIR = process.env.UPLOADS_DIR ?? join(__dirname, "..", "..", "uploads");

/** Repli local pour le développement quand R2 n'est pas configuré — fichiers servis via /uploads (voir main.ts). */
export class LocalDiskStorageProvider implements StorageProvider {
  constructor(private readonly publicBaseUrl: string) {}

  async upload(key: string, buffer: Buffer, _contentType: string): Promise<UploadResult> {
    const filePath = join(UPLOADS_DIR, key);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, buffer);
    return { url: `${this.publicBaseUrl}/uploads/${key}`, key };
  }

  async delete(key: string): Promise<void> {
    await unlink(join(UPLOADS_DIR, key)).catch(() => undefined);
  }
}
