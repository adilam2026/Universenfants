import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PermissionCode } from "@universenfants/shared";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { StaffGuard } from "../auth/guards/staff.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { RequestUser } from "../auth/types";
import { SettingsService } from "./settings.service";
import { UpdateSettingsDto } from "./dto/update-settings.dto";

@ApiTags("settings")
@Controller("settings")
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  // Public : TVA, taux de conversion fidélité et seuil de livraison offerte
  // ne sont pas sensibles (un client les voit de toute façon sur son ticket,
  // son solde de points ou la vitrine) — apps/web en a besoin pour afficher
  // des montants réels au lieu de constantes codées en dur qui divergent
  // silencieusement dès qu'un admin change un paramètre en Back-Office.
  @Get()
  get() {
    return this.service.get();
  }

  @Put()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard, PermissionsGuard)
  @RequirePermissions(PermissionCode.SETTINGS_MANAGE)
  update(@Body() dto: UpdateSettingsDto, @CurrentUser() user: RequestUser) {
    return this.service.update(dto, user.sub);
  }
}
