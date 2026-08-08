import { Module } from "@nestjs/common";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { CartModule } from "../cart/cart.module";
import { ProductsModule } from "../catalog/products/products.module";
import { SettingsModule } from "../settings/settings.module";

@Module({
  imports: [CartModule, ProductsModule, SettingsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
