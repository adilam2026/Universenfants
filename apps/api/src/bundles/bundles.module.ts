import { Module } from "@nestjs/common";
import { BundlesController } from "./bundles.controller";
import { BundlesService } from "./bundles.service";
import { PricingModule } from "../catalog/pricing/pricing.module";

@Module({
  imports: [PricingModule],
  controllers: [BundlesController],
  providers: [BundlesService],
})
export class BundlesModule {}
