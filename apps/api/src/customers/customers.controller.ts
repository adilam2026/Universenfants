import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PermissionCode } from "@universenfants/shared";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { StaffGuard } from "../auth/guards/staff.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { CustomersService } from "./customers.service";

@ApiTags("customers")
@ApiBearerAuth()
@Controller("customers")
@UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
@RequirePermissions(PermissionCode.CUSTOMER_READ)
export class CustomersController {
  constructor(private readonly service: CustomersService) {}

  @Get()
  list(@Query("q") q?: string, @Query("page") page?: string, @Query("limit") limit?: string) {
    return this.service.list({
      q,
      page: Math.max(1, Number(page) || 1),
      limit: Math.min(200, Number(limit) || 50),
    });
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }
}
