import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PermissionCode } from "@universenfants/shared";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { StaffGuard } from "../auth/guards/staff.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { AuditLogService } from "./audit-log.service";
import { QueryAuditLogsDto } from "./dto/query-audit-logs.dto";

// AuditLogService écrivait déjà les actions Back-Office sensibles (coupons,
// promotions, paramètres, villes...) mais rien n'exposait jamais ce journal
// — aucun endpoint, donc aucune page admin ne pouvait exister pour le
// consulter. Restreint à USER_MANAGE : c'est un journal de sécurité, pas une
// donnée métier courante.
@ApiTags("audit-logs")
@ApiBearerAuth()
@Controller("audit-logs")
@UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
@RequirePermissions(PermissionCode.USER_MANAGE)
export class AuditLogController {
  constructor(private readonly service: AuditLogService) {}

  @Get()
  list(@Query() query: QueryAuditLogsDto) {
    return this.service.list(query);
  }
}
