import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PermissionCode } from "@universenfants/shared";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { StaffGuard } from "../../auth/guards/staff.guard";
import { PermissionsGuard } from "../../auth/guards/permissions.guard";
import { RequirePermissions } from "../../auth/decorators/require-permissions.decorator";
import { CouponsService } from "./coupons.service";
import { UpsertCouponDto } from "./dto/upsert-coupon.dto";

@ApiTags("coupons")
@ApiBearerAuth()
@Controller("coupons")
@UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
export class CouponsController {
  constructor(private readonly service: CouponsService) {}

  @Get()
  @RequirePermissions(PermissionCode.COUPON_CREATE)
  list() {
    return this.service.list();
  }

  @Post()
  @RequirePermissions(PermissionCode.COUPON_CREATE)
  create(@Body() dto: UpsertCouponDto) {
    return this.service.create(dto);
  }

  @Patch(":id")
  @RequirePermissions(PermissionCode.COUPON_UPDATE)
  update(@Param("id") id: string, @Body() dto: UpsertCouponDto) {
    return this.service.update(id, dto);
  }
}
