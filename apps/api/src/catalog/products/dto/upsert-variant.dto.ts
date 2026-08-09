import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class UpsertVariantDto {
  @ApiProperty() @IsString() sku!: string;
  @ApiProperty({ description: 'Ex. "Rouge", "Grand modèle"' }) @IsString() label!: string;
  @ApiPropertyOptional({ description: "Vide = hérite du prix produit" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) costPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) stock?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() image?: string;
}
