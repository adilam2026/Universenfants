import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
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
  register(@Body() dto: RegisterCustomerDto) {
    return this.service.register(dto);
  }

  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.service.login(dto);
  }

  @Post("forgot-password")
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
