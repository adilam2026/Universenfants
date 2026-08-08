import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { nanoid } from "nanoid";
import sharp from "sharp";
import { STORAGE_SERVICE, type StorageProvider, type UploadResult } from "./storage.constants";

const MAX_DIMENSION = 1600;
const THUMBNAIL_DIMENSION = 400;

@Injectable()
export class ImageService {
  constructor(@Inject(STORAGE_SERVICE) private readonly storage: StorageProvider) {}

  /** Valide, redimensionne (max 1600px) et ré-encode en WebP — génère aussi une miniature 400px. */
  async processAndUpload(buffer: Buffer, folder: string): Promise<UploadResult & { thumbnailUrl: string }> {
    let metadata: sharp.Metadata;
    try {
      metadata = await sharp(buffer).metadata();
    } catch {
      throw new BadRequestException("Fichier image invalide");
    }
    if (!metadata.width || !metadata.height) {
      throw new BadRequestException("Fichier image invalide");
    }

    const id = nanoid(16);
    const full = await sharp(buffer)
      .rotate()
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    const thumbnail = await sharp(buffer)
      .rotate()
      .resize({ width: THUMBNAIL_DIMENSION, height: THUMBNAIL_DIMENSION, fit: "cover" })
      .webp({ quality: 75 })
      .toBuffer();

    const uploaded = await this.storage.upload(`${folder}/${id}.webp`, full, "image/webp");
    const thumb = await this.storage.upload(`${folder}/${id}-thumb.webp`, thumbnail, "image/webp");

    return { ...uploaded, thumbnailUrl: thumb.url };
  }

  async remove(key: string) {
    await this.storage.delete(key);
  }
}
