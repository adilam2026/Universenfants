import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { CustomerGuard } from "./guards/customer.guard";
import { CurrentUser } from "./decorators/current-user.decorator";
import type { RequestUser } from "./types";
import { CustomerAuthService } from "./customer-auth.service";
import { RegisterCustomerDto } from "./dto/register-customer.dto";
import { LoginDto } from "./dto/login.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";

@ApiTags("auth-customer")
@Controller("auth/customer")
export class CustomerAuthController {
  constructor(private readonly service: CustomerAuthService) {}

  @Post("register")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  register(@Body() dto: RegisterCustomerDto) {
    return this.service.register(dto);
  }

  // Pas de verrou compte comme côté staff (§ moins critique — pas d'accès
  // back-office) : un throttle par IP suffit à ralentir le brute-force.
  @Post("login")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  login(@Body() dto: LoginDto) {
    return this.service.login(dto);
  }

  @Post("forgot-password")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.service.forgotPassword(dto);
  }

  @Post("reset-password")
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.service.resetPassword(dto);
  }

  @Get("me")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, CustomerGuard)
  me(@CurrentUser() user: RequestUser) {
    return this.service.me(user.sub);
  }
}
