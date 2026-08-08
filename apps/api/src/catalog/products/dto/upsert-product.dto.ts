import { ApiPropertyOptional, ApiProperty } from "@nestjs/swagger";
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class UpsertProductDto {
  @ApiProperty() @IsString() sku!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() barcode?: string;
  @ApiProperty() @IsString() nameFr!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nameAr?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shortDescFr?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shortDescAr?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() longDescFr?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() longDescAr?: string;

  @ApiProperty() @IsString() categoryId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() brandId?: string;

  @ApiPropertyOptional() @IsOptional() @IsInt() ageMin?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() ageMax?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(["BOY", "GIRL", "UNISEX"])
  targetGender?: "BOY" | "GIRL" | "UNISEX";

  @ApiProperty() @IsNumber() @Min(0) price!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) promoPrice?: number;
  @ApiProperty() @IsNumber() @Min(0) costPrice!: number;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) stock?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) alertThreshold?: number;

  @ApiProperty() @IsString() seoUrl!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() metaTitle?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() metaDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"])
  status?: "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED";
}
