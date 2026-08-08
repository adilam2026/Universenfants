import { Body, Controller, Post, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { StaffAuthService } from "./staff-auth.service";
import { StaffLoginDto } from "./dto/staff-login.dto";

@ApiTags("auth-staff")
@Controller("auth/staff")
export class StaffAuthController {
  constructor(private readonly service: StaffAuthService) {}

  @Post("login")
  login(@Body() dto: StaffLoginDto, @Req() req: Request) {
    return this.service.login(dto, req);
  }
}
