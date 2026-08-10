import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PermissionCode } from "@universenfants/shared";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { StaffGuard } from "../auth/guards/staff.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { RequestUser } from "../auth/types";
import { BundlesService, type UpsertBundleFields } from "./bundles.service";

@ApiTags("bundles")
@Controller("bundles")
export class BundlesController {
  constructor(private readonly service: BundlesService) {}

  @Get("active")
  listActive() {
    return this.service.listActive();
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.PROMOTION_CREATE)
  list() {
    return this.service.list();
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.PROMOTION_CREATE)
  create(@Body() fields: UpsertBundleFields, @CurrentUser() user: RequestUser) {
    return this.service.create(fields, user.sub);
  }

  @Patch(":id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.PROMOTION_UPDATE)
  update(@Param("id") id: string, @Body() fields: UpsertBundleFields, @CurrentUser() user: RequestUser) {
    return this.service.update(id, fields, user.sub);
  }

  @Delete(":id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.PROMOTION_UPDATE)
  remove(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.service.remove(id, user.sub);
  }
}
