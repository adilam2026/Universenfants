import { Module } from "@nestjs/common";
import { BirthdayListController } from "./birthday-list.controller";
import { BirthdayListService } from "./birthday-list.service";
import { PricingModule } from "../catalog/pricing/pricing.module";

@Module({
  imports: [PricingModule],
  controllers: [BirthdayListController],
  providers: [BirthdayListService],
})
export class BirthdayListModule {}
