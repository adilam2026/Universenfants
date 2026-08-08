import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { StaffGuard } from "../../auth/guards/staff.guard";
import { PermissionsGuard } from "../../auth/guards/permissions.guard";
import { RequirePermissions } from "../../auth/decorators/require-permissions.decorator";
import { PermissionCode } from "@universenfants/shared";
import { CategoriesService } from "./categories.service";
import { UpsertCategoryDto } from "./dto/upsert-category.dto";

@ApiTags("catalog")
@Controller("categories")
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  @Get("tree")
  tree() {
    return this.service.tree();
  }

  @Get(":slug")
  bySlug(@Param("slug") slug: string) {
    return this.service.findBySlug(slug);
  }

  @Get()
  @UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.PRODUCT_READ)
  list() {
    return this.service.list();
  }

  @Post()
  @UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.PRODUCT_CREATE)
  create(@Body() dto: UpsertCategoryDto) {
    return this.service.create(dto);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.PRODUCT_UPDATE)
  update(@Param("id") id: string, @Body() dto: UpsertCategoryDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.PRODUCT_DELETE)
  archive(@Param("id") id: string) {
    return this.service.archive(id);
  }
}
