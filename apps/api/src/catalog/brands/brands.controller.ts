import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { StaffGuard } from "../../auth/guards/staff.guard";
import { PermissionsGuard } from "../../auth/guards/permissions.guard";
import { RequirePermissions } from "../../auth/decorators/require-permissions.decorator";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import type { RequestUser } from "../../auth/types";
import { PermissionCode } from "@universenfants/shared";
import { BrandsService } from "./brands.service";
import { UpsertBrandDto } from "./dto/upsert-brand.dto";

@ApiTags("catalog")
@Controller("brands")
export class BrandsController {
  constructor(private readonly service: BrandsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.PRODUCT_READ)
  list() {
    return this.service.list();
  }

  @Post()
  @UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.PRODUCT_CREATE)
  create(@Body() dto: UpsertBrandDto, @CurrentUser() user: RequestUser) {
    return this.service.create(dto, user.sub);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.PRODUCT_UPDATE)
  update(@Param("id") id: string, @Body() dto: UpsertBrandDto, @CurrentUser() user: RequestUser) {
    return this.service.update(id, dto, user.sub);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.PRODUCT_DELETE)
  archive(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.service.archive(id, user.sub);
  }
}
