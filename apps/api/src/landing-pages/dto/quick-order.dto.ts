import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";

// §11 : formulaire volontairement minimal — pas de compte, pas de panier.
export class QuickOrderDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() phone!: string;
  @ApiProperty() @IsString() city!: string;

  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(999) quantity?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() addressLine?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string;
}
