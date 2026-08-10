import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PermissionCode } from "@universenfants/shared";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { StaffGuard } from "../auth/guards/staff.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { RequestUser } from "../auth/types";
import { RolesService } from "./roles.service";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpsertRoleDto } from "./dto/upsert-role.dto";

@ApiTags("staff-users")
@ApiBearerAuth()
@Controller("roles")
@UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
@RequirePermissions(PermissionCode.USER_MANAGE)
export class RolesController {
  constructor(private readonly service: RolesService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get("permissions")
  listPermissions() {
    return this.service.listPermissions();
  }

  @Post()
  create(@Body() dto: CreateRoleDto, @CurrentUser() user: RequestUser) {
    return this.service.create(dto, user.sub);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpsertRoleDto, @CurrentUser() user: RequestUser) {
    return this.service.update(id, dto, user.sub);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.service.remove(id, user.sub);
  }
}
