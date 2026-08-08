import { Module } from "@nestjs/common";
import { BirthdayListController } from "./birthday-list.controller";
import { BirthdayListService } from "./birthday-list.service";

@Module({
  controllers: [BirthdayListController],
  providers: [BirthdayListService],
})
export class BirthdayListModule {}
