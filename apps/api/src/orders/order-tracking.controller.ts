import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { OrderTrackingService } from "./order-tracking.service";
import { RequestTrackingOtpDto } from "./dto/request-tracking-otp.dto";
import { VerifyTrackingOtpDto } from "./dto/verify-tracking-otp.dto";
import { GuestOrderTrackingGuard } from "./guards/guest-order-tracking.guard";
import { CurrentGuestOrderId } from "./decorators/current-guest-order-id.decorator";

@Controller("orders/track")
export class OrderTrackingController {
  constructor(private readonly service: OrderTrackingService) {}

  @Post("request-otp")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  requestOtp(@Body() dto: RequestTrackingOtpDto) {
    return this.service.requestOtp(dto.orderNumber.trim());
  }

  @Post("verify-otp")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  verifyOtp(@Body() dto: VerifyTrackingOtpDto) {
    return this.service.verifyOtp(dto.orderNumber.trim(), dto.code.trim());
  }

  // Pas de paramètre d'ID dans l'URL : la commande consultée est
  // exclusivement celle encodée dans le token vérifié par le guard — voir
  // CurrentGuestOrderId.
  @Get("me")
  @UseGuards(GuestOrderTrackingGuard)
  me(@CurrentGuestOrderId() orderId: string) {
    return this.service.findByGuestToken(orderId);
  }
}
