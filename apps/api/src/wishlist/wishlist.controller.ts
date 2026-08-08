import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsString } from "class-validator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CustomerGuard } from "../auth/guards/customer.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { RequestUser } from "../auth/types";
import { WishlistService } from "./wishlist.service";

class AddWishlistDto {
  @IsString() productId!: string;
}

@ApiTags("wishlist")
@ApiBearerAuth()
@Controller("wishlist")
@UseGuards(JwtAuthGuard, CustomerGuard)
export class WishlistController {
  constructor(private readonly service: WishlistService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.service.list(user.sub);
  }

  @Post()
  add(@CurrentUser() user: RequestUser, @Body() dto: AddWishlistDto) {
    return this.service.add(user.sub, dto.productId);
  }

  @Delete(":productId")
  remove(@CurrentUser() user: RequestUser, @Param("productId") productId: string) {
    return this.service.remove(user.sub, productId);
  }
}
