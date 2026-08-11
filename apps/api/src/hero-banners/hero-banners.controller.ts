import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, UploadedFiles, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PermissionCode } from "@universenfants/shared";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { StaffGuard } from "../auth/guards/staff.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { RequestUser } from "../auth/types";
import { HeroBannersService, type HeroBannerFields } from "./hero-banners.service";

@ApiTags("hero-banners")
@Controller("hero-banners")
export class HeroBannersController {
  constructor(private readonly service: HeroBannersService) {}

  // Public : consommé par la home du storefront.
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
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "fileDesktop", maxCount: 1 },
        { name: "fileMobile", maxCount: 1 },
      ],
      { limits: { fileSize: 5 * 1024 * 1024 } },
    ),
  )
  create(
    @UploadedFiles() files: { fileDesktop?: Express.Multer.File[]; fileMobile?: Express.Multer.File[] },
    @Body() fields: HeroBannerFields,
    @CurrentUser() user: RequestUser,
  ) {
    const desktop = files.fileDesktop?.[0];
    if (!desktop) throw new BadRequestException("Image desktop requise");
    return this.service.create(fields, desktop.buffer, files.fileMobile?.[0]?.buffer, user.sub);
  }

  @Patch(":id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.PROMOTION_UPDATE)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "fileDesktop", maxCount: 1 },
        { name: "fileMobile", maxCount: 1 },
      ],
      { limits: { fileSize: 5 * 1024 * 1024 } },
    ),
  )
  update(
    @Param("id") id: string,
    @UploadedFiles() files: { fileDesktop?: Express.Multer.File[]; fileMobile?: Express.Multer.File[] },
    @Body() fields: HeroBannerFields,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.update(id, fields, files.fileDesktop?.[0]?.buffer, files.fileMobile?.[0]?.buffer, user.sub);
  }

  @Delete(":id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.PROMOTION_UPDATE)
  remove(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.service.remove(id, user.sub);
  }
}
