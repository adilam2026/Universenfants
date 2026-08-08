import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsIn, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class UpsertPromotionDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty({ enum: ["PERCENTAGE", "FIXED_AMOUNT"] })
  @IsIn(["PERCENTAGE", "FIXED_AMOUNT"])
  type!: "PERCENTAGE" | "FIXED_AMOUNT";

  @ApiProperty() @IsNumber() @Min(0) value!: number;

  @ApiProperty({ enum: ["CATEGORY", "BRAND", "STORE"] })
  @IsIn(["CATEGORY", "BRAND", "STORE"])
  scope!: "CATEGORY" | "BRAND" | "STORE";

  @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() brandId?: string;

  @ApiProperty() @IsDateString() startAt!: string;
  @ApiProperty() @IsDateString() endAt!: string;

  @ApiPropertyOptional({ enum: ["DRAFT", "SCHEDULED", "ACTIVE", "ENDED"] })
  @IsOptional()
  @IsIn(["DRAFT", "SCHEDULED", "ACTIVE", "ENDED"])
  status?: "DRAFT" | "SCHEDULED" | "ACTIVE" | "ENDED";
}
