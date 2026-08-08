import { BadRequestException, Body, Controller, Delete, Get, Headers, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CustomerGuard } from "../auth/guards/customer.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { RequestUser } from "../auth/types";
import { BirthdayListService } from "./birthday-list.service";
import { AddBirthdayListItemDto, CreateBirthdayListDto } from "./dto/birthday-list.dto";

@ApiTags("birthday-lists")
@Controller("birthday-lists")
export class BirthdayListController {
  constructor(private readonly service: BirthdayListService) {}

  @Get("mine")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, CustomerGuard)
  listMine(@CurrentUser() user: RequestUser) {
    return this.service.listMine(user.sub);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, CustomerGuard)
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateBirthdayListDto) {
    return this.service.create(user.sub, dto);
  }

  @Post(":id/items")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, CustomerGuard)
  addItem(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: AddBirthdayListItemDto) {
    return this.service.addItem(user.sub, id, dto.productId);
  }

  @Delete(":id/items/:itemId")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, CustomerGuard)
  removeItem(@CurrentUser() user: RequestUser, @Param("id") id: string, @Param("itemId") itemId: string) {
    return this.service.removeItem(user.sub, id, itemId);
  }

  @Get("shared/:shareToken")
  getShared(@Param("shareToken") shareToken: string) {
    return this.service.getShared(shareToken);
  }

  @Post("shared/:shareToken/items/:itemId/reserve")
  reserveItem(
    @Param("shareToken") shareToken: string,
    @Param("itemId") itemId: string,
    @Headers("x-cart-token") reserverToken: string,
  ) {
    if (!reserverToken) throw new BadRequestException("En-tête x-cart-token requis");
    return this.service.reserveItem(shareToken, itemId, reserverToken);
  }
}
