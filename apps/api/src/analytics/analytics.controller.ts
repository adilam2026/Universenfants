import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiQuery, ApiTags } from "@nestjs/swagger";
import { PermissionCode } from "@universenfants/shared";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { StaffGuard } from "../auth/guards/staff.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { AnalyticsService } from "./analytics.service";

@ApiTags("analytics")
@ApiBearerAuth()
@Controller("analytics")
@UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
@RequirePermissions(PermissionCode.ANALYTICS_READ)
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get("summary")
  @ApiQuery({ name: "days", required: false, type: Number, description: "Taille de la fenêtre glissante en jours (défaut 30)" })
  summary(@Query("days") days?: string) {
    return this.service.summary(days ? Number(days) : undefined);
  }
}
