import { Global, Module } from "@nestjs/common";
import { STORAGE_SERVICE } from "./storage.constants";
import { R2StorageProvider } from "./r2.provider";
import { VercelBlobStorageProvider } from "./vercel-blob.provider";
import { LocalDiskStorageProvider } from "./local-disk.provider";
import { ImageService } from "./image.service";

const r2Configured = () =>
  Boolean(process.env.R2_ACCOUNT_ID && process.env.R2_BUCKET && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_PUBLIC_URL);

const vercelBlobConfigured = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

@Global()
@Module({
  providers: [
    {
      provide: STORAGE_SERVICE,
      // R2 d'abord si déjà configuré (compatibilité avec un déploiement
      // existant) ; Vercel Blob en repli production sans nouvelle
      // inscription (réutilise le compte Vercel qui héberge déjà apps/web) ;
      // disque local uniquement en dernier recours (dev, ne survit pas aux
      // redéploiements Railway).
      useFactory: () => {
        if (r2Configured()) return new R2StorageProvider();
        if (vercelBlobConfigured()) return new VercelBlobStorageProvider();
        return new LocalDiskStorageProvider(process.env.API_PUBLIC_URL ?? "http://localhost:4000");
      },
    },
    ImageService,
  ],
  exports: [STORAGE_SERVICE, ImageService],
})
export class StorageModule {}
