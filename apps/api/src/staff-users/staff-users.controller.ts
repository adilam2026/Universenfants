import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PermissionCode } from "@universenfants/shared";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { StaffGuard } from "../auth/guards/staff.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { RequestUser } from "../auth/types";
import { StaffUsersService } from "./staff-users.service";
import { CreateStaffUserDto } from "./dto/create-staff-user.dto";
import { UpdateStaffUserDto } from "./dto/update-staff-user.dto";
import { ResetStaffPasswordDto } from "./dto/reset-staff-password.dto";

@ApiTags("staff-users")
@ApiBearerAuth()
@Controller("staff-users")
@UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
@RequirePermissions(PermissionCode.USER_MANAGE)
export class StaffUsersController {
  constructor(private readonly service: StaffUsersService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  create(@Body() dto: CreateStaffUserDto, @CurrentUser() user: RequestUser) {
    return this.service.create(dto, user.sub);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateStaffUserDto, @CurrentUser() user: RequestUser) {
    return this.service.update(id, dto, user.sub);
  }

  @Post(":id/reset-password")
  resetPassword(@Param("id") id: string, @Body() dto: ResetStaffPasswordDto, @CurrentUser() user: RequestUser) {
    return this.service.resetPassword(id, dto, user.sub);
  }
}
