import { Global, Module } from "@nestjs/common";
import { STORAGE_SERVICE } from "./storage.constants";
import { R2StorageProvider } from "./r2.provider";
import { LocalDiskStorageProvider } from "./local-disk.provider";
import { ImageService } from "./image.service";

const r2Configured = () =>
  Boolean(process.env.R2_ACCOUNT_ID && process.env.R2_BUCKET && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_PUBLIC_URL);

@Global()
@Module({
  providers: [
    {
      provide: STORAGE_SERVICE,
      useFactory: () =>
        r2Configured()
          ? new R2StorageProvider()
          : new LocalDiskStorageProvider(process.env.API_PUBLIC_URL ?? "http://localhost:4000"),
    },
    ImageService,
  ],
  exports: [STORAGE_SERVICE, ImageService],
})
export class StorageModule {}
