import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";

export class QueryProductsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string; // slug
  @ApiPropertyOptional() @IsOptional() @IsString() brand?: string; // slug
  @ApiPropertyOptional() @IsOptional() @IsString() q?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() ageMin?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() ageMax?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) priceMin?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) priceMax?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Boolean) @IsBoolean() promoOnly?: boolean;
  @ApiPropertyOptional() @IsOptional() @Type(() => Boolean) @IsBoolean() inStockOnly?: boolean;
  @ApiPropertyOptional({ enum: ["BOY", "GIRL", "UNISEX"] })
  @IsOptional()
  @IsIn(["BOY", "GIRL", "UNISEX"])
  gender?: "BOY" | "GIRL" | "UNISEX";

  @ApiPropertyOptional({ enum: ["relevance", "price_asc", "price_desc", "newest", "bestsellers", "rating"] })
  @IsOptional()
  @IsIn(["relevance", "price_asc", "price_desc", "newest", "bestsellers", "rating"])
  sort?: "relevance" | "price_asc" | "price_desc" | "newest" | "bestsellers" | "rating";

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number = 24;
}
