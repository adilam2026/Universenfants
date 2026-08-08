import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PermissionCode } from "@universenfants/shared";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CustomerGuard } from "../auth/guards/customer.guard";
import { StaffGuard } from "../auth/guards/staff.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { RequestUser } from "../auth/types";
import { ReviewsService } from "./reviews.service";
import { CreateReviewDto } from "./dto/create-review.dto";
import { ModerateReviewDto } from "./dto/moderate-review.dto";

@ApiTags("reviews")
@Controller("reviews")
export class ReviewsController {
  constructor(private readonly service: ReviewsService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, CustomerGuard)
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateReviewDto) {
    return this.service.create(user.sub, dto);
  }

  @Get("eligibility/:productId")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, CustomerGuard)
  eligibility(@CurrentUser() user: RequestUser, @Param("productId") productId: string) {
    return this.service.eligibility(user.sub, productId);
  }

  @Get("admin")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.PRODUCT_UPDATE)
  listForAdmin(@Query("status") status?: string) {
    return this.service.listForAdmin(status);
  }

  @Patch("admin/:id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.PRODUCT_UPDATE)
  moderate(@Param("id") id: string, @Body() dto: ModerateReviewDto) {
    return this.service.moderate(id, dto);
  }
}
