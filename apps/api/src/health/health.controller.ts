import { Controller, Get, Inject, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type Redis from "ioredis";
import type { Response } from "express";
import { PrismaService } from "../prisma/prisma.service";
import { REDIS_CLIENT } from "../redis/redis.module";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Get()
  async check(@Res({ passthrough: true }) res: Response) {
    const [db, redis] = await Promise.allSettled([
      this.prisma.$queryRaw`SELECT 1`,
      this.redis.ping(),
    ]);
    const healthy = db.status === "fulfilled" && redis.status === "fulfilled";
    // Répondre 200 même en cas de panne DB/Redis rendrait ce endpoint inutile
    // pour Docker HEALTHCHECK, un load balancer ou une sonde k8s — tous se
    // basent sur le code HTTP, pas sur le corps de la réponse.
    res.status(healthy ? 200 : 503);
    return {
      status: healthy ? "ok" : "degraded",
      database: db.status === "fulfilled" ? "up" : "down",
      redis: redis.status === "fulfilled" ? "up" : "down",
      timestamp: new Date().toISOString(),
    };
  }
}
