import { Module } from "@nestjs/common";
import { CitiesController } from "./cities.controller";
import { CitiesService } from "./cities.service";
import { CityGroupsController } from "./city-groups.controller";
import { CityGroupsService } from "./city-groups.service";
import { SettingsModule } from "../settings/settings.module";

@Module({
  imports: [SettingsModule],
  controllers: [CitiesController, CityGroupsController],
  providers: [CitiesService, CityGroupsService],
})
export class CitiesModule {}
