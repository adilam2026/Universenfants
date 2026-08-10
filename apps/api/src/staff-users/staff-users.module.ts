import { Module } from "@nestjs/common";
import { StaffUsersController } from "./staff-users.controller";
import { StaffUsersService } from "./staff-users.service";
import { RolesController } from "./roles.controller";
import { RolesService } from "./roles.service";

@Module({
  controllers: [StaffUsersController, RolesController],
  providers: [StaffUsersService, RolesService],
})
export class StaffUsersModule {}
