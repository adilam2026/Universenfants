import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import type Redis from "ioredis";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule, REDIS_CLIENT } from "./redis/redis.module";
import { ResilientThrottlerStorageService } from "./redis/resilient-throttler-storage.service";
import { HealthController } from "./health/health.controller";
import { AuthModule } from "./auth/auth.module";
import { CategoriesModule } from "./catalog/categories/categories.module";
import { BrandsModule } from "./catalog/brands/brands.module";
import { ProductsModule } from "./catalog/products/products.module";
import { CartModule } from "./cart/cart.module";
import { WishlistModule } from "./wishlist/wishlist.module";
import { OrdersModule } from "./orders/orders.module";
import { BirthdayListModule } from "./birthday-list/birthday-list.module";
import { CustomersModule } from "./customers/customers.module";
import { CitiesModule } from "./cities/cities.module";
import { CouponsModule } from "./marketing/coupons/coupons.module";
import { PromotionsModule } from "./marketing/promotions/promotions.module";
import { SettingsModule } from "./settings/settings.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { ReviewsModule } from "./reviews/reviews.module";
import { LandingPagesModule } from "./landing-pages/landing-pages.module";
import { SearchModule } from "./search/search.module";
import { StorageModule } from "./storage/storage.module";
import { EmailModule } from "./email/email.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Stockage Redis (pas la mémoire par défaut) : indispensable dès que
    // l'API tourne sur plus d'une instance (déploiements à zéro downtime,
    // scaling horizontal) — sinon chaque instance compte séparément et la
    // limite réelle devient limit × nombre d'instances.
    ThrottlerModule.forRootAsync({
      imports: [RedisModule],
      inject: [REDIS_CLIENT],
      useFactory: (redis: Redis) => ({
        throttlers: [{ ttl: 60_000, limit: 120 }],
        storage: new ResilientThrottlerStorageService(redis),
      }),
    }),
    PrismaModule,
    RedisModule,
    SearchModule,
    StorageModule,
    EmailModule,
    AuthModule,
    CategoriesModule,
    BrandsModule,
    ProductsModule,
    CartModule,
    WishlistModule,
    OrdersModule,
    BirthdayListModule,
    CustomersModule,
    CitiesModule,
    CouponsModule,
    PromotionsModule,
    SettingsModule,
    AnalyticsModule,
    ReviewsModule,
    LandingPagesModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
