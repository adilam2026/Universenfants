import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { OrderTrackingController } from "./order-tracking.controller";
import { OrderTrackingService } from "./order-tracking.service";
import { GuestOrderTrackingGuard } from "./guards/guest-order-tracking.guard";
import { CartModule } from "../cart/cart.module";
import { ProductsModule } from "../catalog/products/products.module";
import { SettingsModule } from "../settings/settings.module";
import { PricingModule } from "../catalog/pricing/pricing.module";

@Module({
  // JwtModule.register({}) plutôt qu'un secret par défaut : chaque usage
  // (customer, guest-order-tracking...) passe son propre `secret` à
  // sign()/verify() — même pattern que AuthModule, deux jetons de nature
  // différente ne doivent jamais pouvoir se substituer l'un à l'autre.
  imports: [CartModule, ProductsModule, SettingsModule, PricingModule, JwtModule.register({})],
  controllers: [OrdersController, OrderTrackingController],
  providers: [OrdersService, OrderTrackingService, GuestOrderTrackingGuard],
  exports: [OrdersService],
})
export class OrdersModule {}
