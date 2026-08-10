import { ApiPropertyOptional, ApiProperty } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, IsUrl } from "class-validator";

export class UpsertBrandDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() slug!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() logo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsUrl() website?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"])
  status?: "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED";
}
