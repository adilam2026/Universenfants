import { Module } from "@nestjs/common";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { CartModule } from "../cart/cart.module";
import { ProductsModule } from "../catalog/products/products.module";
import { SettingsModule } from "../settings/settings.module";
import { PricingModule } from "../catalog/pricing/pricing.module";

@Module({
  imports: [CartModule, ProductsModule, SettingsModule, PricingModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
