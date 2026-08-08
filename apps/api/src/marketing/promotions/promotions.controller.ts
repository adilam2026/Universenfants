import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PermissionCode } from "@universenfants/shared";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { StaffGuard } from "../../auth/guards/staff.guard";
import { PermissionsGuard } from "../../auth/guards/permissions.guard";
import { RequirePermissions } from "../../auth/decorators/require-permissions.decorator";
import { PromotionsService } from "./promotions.service";
import { UpsertPromotionDto } from "./dto/upsert-promotion.dto";

@ApiTags("promotions")
@ApiBearerAuth()
@Controller("promotions")
@UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
export class PromotionsController {
  constructor(private readonly service: PromotionsService) {}

  @Get()
  @RequirePermissions(PermissionCode.PROMOTION_CREATE)
  list() {
    return this.service.list();
  }

  @Post()
  @RequirePermissions(PermissionCode.PROMOTION_CREATE)
  create(@Body() dto: UpsertPromotionDto) {
    return this.service.create(dto);
  }

  @Patch(":id")
  @RequirePermissions(PermissionCode.PROMOTION_UPDATE)
  update(@Param("id") id: string, @Body() dto: UpsertPromotionDto) {
    return this.service.update(id, dto);
  }
}
