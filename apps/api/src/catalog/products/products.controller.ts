import { BadRequestException, Body, Controller, Get, Headers, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiTags } from "@nestjs/swagger";
import { PermissionCode } from "@universenfants/shared";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { StaffGuard } from "../../auth/guards/staff.guard";
import { PermissionsGuard } from "../../auth/guards/permissions.guard";
import { RequirePermissions } from "../../auth/decorators/require-permissions.decorator";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import type { RequestUser } from "../../auth/types";
import { ProductsService } from "./products.service";
import { QueryProductsDto } from "./dto/query-products.dto";
import { UpsertProductDto } from "./dto/upsert-product.dto";
import { AdjustStockDto } from "./dto/adjust-stock.dto";

@ApiTags("catalog")
@Controller("products")
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get()
  list(@Query() query: QueryProductsDto) {
    return this.service.list(query);
  }

  @Get("admin")
  @UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.PRODUCT_READ)
  listForAdmin(@Query("category") category?: string, @Query("status") status?: string, @Query("lowStock") lowStock?: string) {
    return this.service.listForAdmin({ category, status, lowStock: lowStock === "true" });
  }

  @Get("admin/:id")
  @UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.PRODUCT_READ)
  byIdForAdmin(@Param("id") id: string) {
    return this.service.findByIdForAdmin(id);
  }

  @Get(":slug")
  bySlug(@Param("slug") slug: string, @Headers("x-session-id") sessionId?: string) {
    return this.service.findBySlug(slug, sessionId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.PRODUCT_CREATE)
  create(@Body() dto: UpsertProductDto) {
    return this.service.create(dto);
  }

  @Post("import")
  @UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.PRODUCT_CREATE)
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 5 * 1024 * 1024 } }))
  importExcel(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException("Fichier requis");
    return this.service.importFromExcel(file.buffer);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.PRODUCT_UPDATE)
  update(@Param("id") id: string, @Body() dto: UpsertProductDto, @CurrentUser() user: RequestUser) {
    return this.service.update(id, dto, user.sub);
  }

  @Patch(":id/archive")
  @UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.PRODUCT_DELETE)
  archive(@Param("id") id: string) {
    return this.service.archive(id);
  }

  @Post(":id/stock")
  @UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.STOCK_UPDATE)
  adjustStock(@Param("id") id: string, @Body() dto: AdjustStockDto, @CurrentUser() user: RequestUser) {
    return this.service.adjustStock(id, dto, user.sub);
  }
}
