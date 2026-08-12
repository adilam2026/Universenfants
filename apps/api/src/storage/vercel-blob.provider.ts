import { put, del } from "@vercel/blob";
import type { StorageProvider, UploadResult } from "./storage.constants";

/** Stockage sur le compte Vercel déjà utilisé pour héberger le site (apps/web)
 * — aucune nouvelle inscription/carte bancaire à saisir, contrairement à R2.
 * @vercel/blob s'utilise depuis n'importe quel serveur Node (pas seulement
 * une fonction Vercel) via BLOB_READ_WRITE_TOKEN, exactement comme R2 est
 * déjà appelé depuis cette API hébergée sur Railway. */
export class VercelBlobStorageProvider implements StorageProvider {
  async upload(key: string, buffer: Buffer, contentType: string): Promise<UploadResult> {
    const blob = await put(key, buffer, {
      access: "public",
      contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      // Le nom généré par ImageService (id aléatoire + extension) est déjà
      // unique — un suffixe aléatoire supplémentaire ajouté par défaut par
      // Vercel casserait la correspondance entre le "key" retourné et le
      // fichier réellement stocké.
      addRandomSuffix: false,
    });
    return { url: blob.url, key };
  }

  async delete(key: string): Promise<void> {
    // put() ci-dessus renvoie une URL déjà complète (le pathname de blob.url
    // correspond au "key" transmis, addRandomSuffix étant désactivé) — mais
    // del() exige l'URL complète, pas seulement le key ; on la reconstruit
    // depuis le préfixe déclaré au lieu de la stocker en base séparément.
    const baseUrl = process.env.BLOB_PUBLIC_BASE_URL;
    if (!baseUrl) return;
    await del(`${baseUrl.replace(/\/$/, "")}/${key}`, { token: process.env.BLOB_READ_WRITE_TOKEN });
  }
}
