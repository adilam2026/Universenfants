import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PermissionCode } from "@universenfants/shared";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { StaffGuard } from "../auth/guards/staff.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { RequestUser } from "../auth/types";
import { CitiesService } from "./cities.service";
import { UpsertCityDto } from "./dto/upsert-city.dto";

@ApiTags("cities")
@ApiBearerAuth()
@Controller("cities")
@UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
export class CitiesController {
  constructor(private readonly service: CitiesService) {}

  @Get()
  @RequirePermissions(PermissionCode.SHIPPING_READ)
  list() {
    return this.service.list();
  }

  @Post()
  @RequirePermissions(PermissionCode.SHIPPING_UPDATE)
  create(@Body() dto: UpsertCityDto, @CurrentUser() user: RequestUser) {
    return this.service.create(dto, user.sub);
  }

  @Patch(":id")
  @RequirePermissions(PermissionCode.SHIPPING_UPDATE)
  update(@Param("id") id: string, @Body() dto: UpsertCityDto, @CurrentUser() user: RequestUser) {
    return this.service.update(id, dto, user.sub);
  }
}
