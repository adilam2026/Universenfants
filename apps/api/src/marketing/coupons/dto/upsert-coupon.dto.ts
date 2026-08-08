import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class UpsertCouponDto {
  @ApiProperty() @IsString() code!: string;
  @ApiProperty({ enum: ["PERCENTAGE", "FIXED_AMOUNT", "FREE_SHIPPING"] })
  @IsIn(["PERCENTAGE", "FIXED_AMOUNT", "FREE_SHIPPING"])
  type!: "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIPPING";

  @ApiProperty() @IsNumber() @Min(0) value!: number;
  @ApiProperty() @IsDateString() startAt!: string;
  @ApiProperty() @IsDateString() endAt!: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) maxUses?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) maxUsesPerCustomer?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) minCartAmount?: number;
  @ApiPropertyOptional({ enum: ["DRAFT", "SCHEDULED", "ACTIVE", "ENDED"] })
  @IsOptional()
  @IsIn(["DRAFT", "SCHEDULED", "ACTIVE", "ENDED"])
  status?: "DRAFT" | "SCHEDULED" | "ACTIVE" | "ENDED";
}
