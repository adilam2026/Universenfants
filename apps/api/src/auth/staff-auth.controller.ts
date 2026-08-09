import { Body, Controller, Post, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { StaffAuthService } from "./staff-auth.service";
import { StaffLoginDto } from "./dto/staff-login.dto";

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
}
