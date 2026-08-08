import { Body, Controller, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CustomerAuthService } from "./customer-auth.service";
import { RegisterCustomerDto } from "./dto/register-customer.dto";
import { LoginDto } from "./dto/login.dto";

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
}
