import { Module } from "@nestjs/common";
import { LandingPagesService } from "./landing-pages.service";
import { LandingPagesController } from "./landing-pages.controller";
import { OrdersModule } from "../orders/orders.module";
import { PricingModule } from "../catalog/pricing/pricing.module";

@Module({
  imports: [OrdersModule, PricingModule],
  providers: [LandingPagesService],
  controllers: [LandingPagesController],
})
export class LandingPagesModule {}
