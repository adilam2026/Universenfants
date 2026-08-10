import { Module } from "@nestjs/common";
import { WishlistController, WishlistPublicController } from "./wishlist.controller";
import { WishlistService } from "./wishlist.service";
import { PricingModule } from "../catalog/pricing/pricing.module";

@Module({
  imports: [PricingModule],
  controllers: [WishlistController, WishlistPublicController],
  providers: [WishlistService],
})
export class WishlistModule {}
