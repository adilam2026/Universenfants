import { Body, Controller, Get, Headers, Param, Patch, Post, Query, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { PermissionCode } from "@universenfants/shared";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CustomerGuard } from "../auth/guards/customer.guard";
import { StaffGuard } from "../auth/guards/staff.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { OptionalJwtAuthGuard } from "../auth/guards/optional-jwt-auth.guard";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { RequestUser } from "../auth/types";
import { CartService } from "../cart/cart.service";
import { OrdersService } from "./orders.service";
import { CheckoutDto } from "./dto/checkout.dto";
import { RecordPaymentDto, UpdateOrderStatusDto } from "./dto/update-order-status.dto";

@ApiTags("orders")
@Controller("orders")
export class OrdersController {
  constructor(
    private readonly service: OrdersService,
    private readonly cart: CartService,
  ) {}

  @Post("checkout")
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async checkout(
    @Headers("x-cart-token") cartToken: string,
    @Query("shareToken") shareToken: string | undefined,
    @CurrentUser() user: RequestUser | null,
    @Body() dto: CheckoutDto,
  ) {
    const customerId = user?.kind === "customer" ? user.sub : null;
    const cart = await this.cart.resolveCart(cartToken, customerId, shareToken);
    return this.service.checkout(cart.id, dto);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, CustomerGuard)
  myOrders(@CurrentUser() user: RequestUser) {
    return this.service.listForCustomer(user.sub);
  }

  @Get(":id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, CustomerGuard)
  myOrderDetail(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.service.findForCustomer(user.sub, id);
  }

  @Patch(":id/cancel")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, CustomerGuard)
  cancelMyOrder(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.service.cancelByCustomer(user.sub, id);
  }

  @Get("admin/stats")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.ORDER_READ)
  adminStats() {
    return this.service.statsForAdmin();
  }

  @Get("admin/list")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.ORDER_READ)
  adminList(
    @Query("status") status?: string,
    @Query("city") city?: string,
    @Query("q") q?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.service.listForAdmin({
      status,
      city,
      q,
      page: Math.max(1, Number(page) || 1),
      limit: Math.min(200, Number(limit) || 50),
    });
  }

  @Get("admin/export")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.ORDER_READ)
  async exportOrders(@Query("status") status: string | undefined, @Query("city") city: string | undefined, @Res() res: Response) {
    const csv = await this.service.exportToCsv({ status, city });
    res.set({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="commandes-${new Date().toISOString().slice(0, 10)}.csv"`,
    });
    res.send(`\uFEFF${csv}`);
  }

  @Get("admin/:id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.ORDER_READ)
  adminDetail(@Param("id") id: string) {
    return this.service.findForAdmin(id);
  }

  @Patch("admin/:id/status")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.ORDER_UPDATE)
  updateStatus(@Param("id") id: string, @Body() dto: UpdateOrderStatusDto, @CurrentUser() user: RequestUser) {
    return this.service.updateStatus(id, dto, user.sub);
  }

  @Post("admin/:id/payment")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.ORDER_UPDATE)
  recordPayment(@Param("id") id: string, @Body() dto: RecordPaymentDto) {
    return this.service.recordPayment(id, dto.amount);
  }
}
