import { Body, Controller, Get, Patch, Post, UseGuards } from "@nestjs/common";
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
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { RequestEmailChangeDto } from "./dto/request-email-change.dto";
import { ConfirmEmailChangeDto } from "./dto/confirm-email-change.dto";

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

  @Get("me")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, CustomerGuard)
  me(@CurrentUser() user: RequestUser) {
    return this.service.me(user.sub);
  }

  @Patch("me")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, CustomerGuard)
  updateProfile(@CurrentUser() user: RequestUser, @Body() dto: UpdateProfileDto) {
    return this.service.updateProfile(user.sub, dto);
  }

  @Post("me/email/request-change")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, CustomerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  requestEmailChange(@CurrentUser() user: RequestUser, @Body() dto: RequestEmailChangeDto) {
    return this.service.requestEmailChange(user.sub, dto);
  }

  // Pas de guard : le lien est cliqué depuis l'email, potentiellement sans
  // session active côté navigateur (autre appareil, session expirée) — le
  // token à usage unique dans le corps de la requête EST l'authentification.
  @Post("me/email/confirm-change")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  confirmEmailChange(@Body() dto: ConfirmEmailChangeDto) {
    return this.service.confirmEmailChange(dto);
  }
}
