import { Global, Module } from "@nestjs/common";
import Redis from "ioredis";

export const REDIS_CLIENT = "REDIS_CLIENT";

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      // Sans ces options, une commande envoyée pendant que Redis est
      // injoignable reste en file d'attente jusqu'à épuiser
      // maxRetriesPerRequest (20 par défaut, avec un backoff croissant) —
      // environ 10s avant l'échec. Tout code appelant (ex: verrouillage des
      // tentatives de connexion) reste bloqué tout ce temps au lieu
      // d'échouer vite et de retomber sur son repli. Ici on échoue
      // immédiatement si la connexion n'est pas prête ; chaque appelant est
      // responsable de son repli (voir ResilientThrottlerStorageService,
      // StaffAuthService).
      useFactory: () =>
        new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
        }),
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
