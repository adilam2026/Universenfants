import { BadRequestException, Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
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
import { UpsertVariantDto } from "./dto/upsert-variant.dto";

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

  @Get("admin/stock-movements")
  @UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.PRODUCT_READ)
  stockMovements(@Query("productId") productId?: string, @Query("page") page?: string, @Query("limit") limit?: string) {
    return this.service.stockMovements({
      productId,
      page: Math.max(1, Number(page) || 1),
      limit: Math.min(100, Number(limit) || 50),
    });
  }

  @Get("admin/stock-valuation")
  @UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.PRODUCT_READ)
  stockValuation() {
    return this.service.stockValuation();
  }

  @Get("admin/import-history")
  @UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.PRODUCT_CREATE)
  importHistory() {
    return this.service.listImportHistory();
  }

  @Get("admin/export")
  @UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.PRODUCT_READ)
  async exportCatalog(@Res() res: Response) {
    const buffer = await this.service.exportToExcel();
    res.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="catalogue-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    });
    res.send(buffer);
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
  create(@Body() dto: UpsertProductDto, @CurrentUser() user: RequestUser) {
    return this.service.create(dto, user.sub);
  }

  @Post("import")
  @UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.PRODUCT_CREATE)
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 5 * 1024 * 1024 } }))
  importExcel(@UploadedFile() file: Express.Multer.File | undefined, @CurrentUser() user: RequestUser) {
    if (!file) throw new BadRequestException("Fichier requis");
    const allowedMimeTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
      "text/csv",
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException("Le fichier doit être un tableur Excel (.xlsx, .xls) ou CSV");
    }
    return this.service.importFromExcel(file.buffer, user.sub, file.originalname);
  }

  @Post("admin/reindex-search")
  @UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.PRODUCT_READ)
  reindexSearch() {
    return this.service.reindexSearch();
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
  archive(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.service.archive(id, user.sub);
  }

  @Post(":id/stock")
  @UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.STOCK_UPDATE)
  adjustStock(@Param("id") id: string, @Body() dto: AdjustStockDto, @CurrentUser() user: RequestUser) {
    return this.service.adjustStock(id, dto, user.sub);
  }

  @Post(":id/images")
  @UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.PRODUCT_UPDATE)
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 8 * 1024 * 1024 } }))
  addImage(@Param("id") id: string, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException("Fichier requis");
    if (!file.mimetype.startsWith("image/")) throw new BadRequestException("Le fichier doit être une image");
    return this.service.addImage(id, file.buffer);
  }

  @Delete(":id/images/:imageId")
  @UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.PRODUCT_UPDATE)
  removeImage(@Param("id") id: string, @Param("imageId") imageId: string) {
    return this.service.removeImage(id, imageId);
  }

  @Patch(":id/images/reorder")
  @UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.PRODUCT_UPDATE)
  reorderImages(@Param("id") id: string, @Body() body: { imageIds: string[] }) {
    return this.service.reorderImages(id, body.imageIds);
  }

  @Post(":id/variants")
  @UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.PRODUCT_UPDATE)
  addVariant(@Param("id") id: string, @Body() dto: UpsertVariantDto) {
    return this.service.addVariant(id, dto);
  }

  @Patch(":id/variants/:variantId")
  @UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.PRODUCT_UPDATE)
  updateVariant(@Param("id") id: string, @Param("variantId") variantId: string, @Body() dto: UpsertVariantDto) {
    return this.service.updateVariant(id, variantId, dto);
  }

  @Delete(":id/variants/:variantId")
  @UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.PRODUCT_UPDATE)
  removeVariant(@Param("id") id: string, @Param("variantId") variantId: string) {
    return this.service.removeVariant(id, variantId);
  }
}
