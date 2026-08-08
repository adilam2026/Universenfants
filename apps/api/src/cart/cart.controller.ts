import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query, Res, UseGuards } from "@nestjs/common";
import { ApiHeader, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { nanoid } from "nanoid";
import { OptionalJwtAuthGuard } from "../auth/guards/optional-jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { RequestUser } from "../auth/types";
import { CartService } from "./cart.service";
import { AddCartLineDto, ApplyCouponDto, JoinSharedCartDto, UpdateCartLineDto } from "./dto/cart.dto";

@ApiTags("cart")
@ApiHeader({ name: "x-cart-token", required: false, description: "Identifiant du panier invité" })
@Controller("cart")
@UseGuards(OptionalJwtAuthGuard)
export class CartController {
  constructor(private readonly service: CartService) {}

  private async resolve(
    cartToken: string | undefined,
    shareToken: string | undefined,
    user: RequestUser | null,
    res: Response,
  ) {
    const token = cartToken ?? nanoid(24);
    if (!cartToken) res.setHeader("x-cart-token", token);
    const customerId = user?.kind === "customer" ? user.sub : null;
    const cart = await this.service.resolveCart(token, customerId, shareToken);
    return cart;
  }

  @Get()
  async getCart(
    @Headers("x-cart-token") cartToken: string | undefined,
    @Query("shareToken") shareToken: string | undefined,
    @CurrentUser() user: RequestUser | null,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cart = await this.resolve(cartToken, shareToken, user, res);
    return this.service.getFullCart(cart.id);
  }

  @Post("lines")
  async addLine(
    @Headers("x-cart-token") cartToken: string | undefined,
    @Query("shareToken") shareToken: string | undefined,
    @CurrentUser() user: RequestUser | null,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: AddCartLineDto,
  ) {
    const cart = await this.resolve(cartToken, shareToken, user, res);
    await this.service.addLine(cart.id, dto);
    return this.service.getFullCart(cart.id);
  }

  @Patch("lines/:lineId")
  async updateLine(
    @Headers("x-cart-token") cartToken: string | undefined,
    @Query("shareToken") shareToken: string | undefined,
    @CurrentUser() user: RequestUser | null,
    @Res({ passthrough: true }) res: Response,
    @Param("lineId") lineId: string,
    @Body() dto: UpdateCartLineDto,
  ) {
    const cart = await this.resolve(cartToken, shareToken, user, res);
    await this.service.updateLine(cart.id, lineId, dto);
    return this.service.getFullCart(cart.id);
  }

  @Delete("lines/:lineId")
  async removeLine(
    @Headers("x-cart-token") cartToken: string | undefined,
    @Query("shareToken") shareToken: string | undefined,
    @CurrentUser() user: RequestUser | null,
    @Res({ passthrough: true }) res: Response,
    @Param("lineId") lineId: string,
  ) {
    const cart = await this.resolve(cartToken, shareToken, user, res);
    await this.service.removeLine(cart.id, lineId);
    return this.service.getFullCart(cart.id);
  }

  @Post("coupon")
  async applyCoupon(
    @Headers("x-cart-token") cartToken: string | undefined,
    @CurrentUser() user: RequestUser | null,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: ApplyCouponDto,
  ) {
    const cart = await this.resolve(cartToken, undefined, user, res);
    return this.service.applyCoupon(cart.id, dto.code);
  }

  @Delete("coupon")
  async removeCoupon(
    @Headers("x-cart-token") cartToken: string | undefined,
    @CurrentUser() user: RequestUser | null,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cart = await this.resolve(cartToken, undefined, user, res);
    return this.service.removeCoupon(cart.id);
  }

  @Post("share")
  async share(
    @Headers("x-cart-token") cartToken: string | undefined,
    @CurrentUser() user: RequestUser | null,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cart = await this.resolve(cartToken, undefined, user, res);
    return this.service.share(cart.id);
  }

  @Post("shared/:shareToken/join")
  joinShared(@Param("shareToken") shareToken: string, @Body() dto: JoinSharedCartDto) {
    return this.service.joinShared(shareToken, dto.email);
  }
}
