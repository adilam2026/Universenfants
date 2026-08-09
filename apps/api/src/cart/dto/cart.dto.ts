import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

// Aucun client légitime n'a besoin de plus de quelques centaines d'unités
// d'un même article — sans plafond, quantity n'était bornée par rien
// jusqu'au checkout (où reserveStock la rejette de toute façon faute de
// stock), mais rien n'empêchait une valeur absurde de circuler avant ça.
const MAX_LINE_QUANTITY = 999;

export class AddCartLineDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @IsInt() @Min(1) @Max(MAX_LINE_QUANTITY) quantity?: number;
}

export class UpdateCartLineDto {
  @ApiProperty() @IsInt() @Min(1) @Max(MAX_LINE_QUANTITY) quantity!: number;
}

export class ApplyCouponDto {
  @ApiProperty() @IsString() code!: string;
}

export class JoinSharedCartDto {
  @ApiProperty() @IsEmail() email!: string;
}
