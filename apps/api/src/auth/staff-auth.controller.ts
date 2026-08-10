import { Body, Controller, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { StaffAuthService } from "./staff-auth.service";
import { StaffLoginDto } from "./dto/staff-login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { ChangeStaffPasswordDto } from "./dto/change-staff-password.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { StaffGuard } from "./guards/staff.guard";
import { CurrentUser } from "./decorators/current-user.decorator";
import type { RequestUser } from "./types";

@ApiTags("auth-staff")
@Controller("auth/staff")
export class StaffAuthController {
  constructor(private readonly service: StaffAuthService) {}

  // Le verrou compte (Redis) dans le service reste la protection principale ;
  // ce throttle par IP est une défense en profondeur complémentaire.
  @Post("login")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  login(@Body() dto: StaffLoginDto, @Req() req: Request) {
    return this.service.login(dto, req);
  }

  @Post("refresh")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.service.refresh(dto.refreshToken);
  }

  @Post("logout")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  logout(@Body() dto: RefreshTokenDto) {
    return this.service.logout(dto.refreshToken);
  }

  @Patch("me/password")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  changePassword(@CurrentUser() user: RequestUser, @Body() dto: ChangeStaffPasswordDto) {
    return this.service.changePassword(user.sub, dto);
  }
}
