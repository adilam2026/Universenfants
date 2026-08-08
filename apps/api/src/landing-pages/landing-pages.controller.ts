import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PermissionCode } from "@universenfants/shared";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { StaffGuard } from "../auth/guards/staff.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { LandingPagesService } from "./landing-pages.service";
import { UpsertLandingPageDto } from "./dto/upsert-landing-page.dto";
import { QuickOrderDto } from "./dto/quick-order.dto";

@ApiTags("landing-pages")
@Controller("landing-pages")
export class LandingPagesController {
  constructor(private readonly service: LandingPagesService) {}

  // ---------------------------------------------------------------- admin

  @Get("admin")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.PROMOTION_CREATE)
  listForAdmin() {
    return this.service.listForAdmin();
  }

  @Get("admin/:id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.PROMOTION_CREATE)
  findForAdmin(@Param("id") id: string) {
    return this.service.findForAdmin(id);
  }

  @Get("admin/:id/analytics")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.PROMOTION_CREATE)
  analytics(@Param("id") id: string) {
    return this.service.analytics(id);
  }

  @Post("admin")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.PROMOTION_CREATE)
  create(@Body() dto: UpsertLandingPageDto) {
    return this.service.create(dto);
  }

  @Patch("admin/:id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.PROMOTION_UPDATE)
  update(@Param("id") id: string, @Body() dto: UpsertLandingPageDto) {
    return this.service.update(id, dto);
  }

  @Post("admin/:id/duplicate")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.PROMOTION_CREATE)
  duplicate(@Param("id") id: string) {
    return this.service.duplicate(id);
  }

  @Patch("admin/:id/archive")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.PROMOTION_UPDATE)
  archive(@Param("id") id: string) {
    return this.service.archive(id);
  }

  // --------------------------------------------------------------- public

  @Get(":slug")
  findBySlug(@Param("slug") slug: string) {
    return this.service.findBySlug(slug);
  }

  @Post(":slug/visit")
  trackVisit(@Param("slug") slug: string) {
    return this.service.trackVisit(slug);
  }

  @Post(":slug/quick-order")
  quickOrder(@Param("slug") slug: string, @Body() dto: QuickOrderDto) {
    return this.service.quickOrder(slug, dto);
  }
}
