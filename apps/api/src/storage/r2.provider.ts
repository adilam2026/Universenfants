import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import type { StorageProvider, UploadResult } from "./storage.constants";

/** Cloudflare R2 est compatible S3 — même client, endpoint et credentials différents. */
export class R2StorageProvider implements StorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID!;
    this.bucket = process.env.R2_BUCKET!;
    this.publicUrl = process.env.R2_PUBLIC_URL!.replace(/\/$/, "");
    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
      // Sans ça, un endpoint R2 qui ne répond plus laisse la requête
      // d'upload d'image produit pendre indéfiniment au lieu d'échouer vite.
      requestHandler: { connectionTimeout: 5_000, requestTimeout: 15_000 },
    });
  }

  async upload(key: string, buffer: Buffer, contentType: string): Promise<UploadResult> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    return { url: `${this.publicUrl}/${key}`, key };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
