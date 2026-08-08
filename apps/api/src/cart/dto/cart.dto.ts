import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsInt, IsOptional, IsString, Min } from "class-validator";

export class AddCartLineDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @IsInt() @Min(1) quantity?: number;
}

export class UpdateCartLineDto {
  @ApiProperty() @IsInt() @Min(1) quantity!: number;
}

export class ApplyCouponDto {
  @ApiProperty() @IsString() code!: string;
}

export class JoinSharedCartDto {
  @ApiProperty() @IsEmail() email!: string;
}
