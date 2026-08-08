import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class UpsertCityDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsNumber() @Min(0) shippingFee!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) freeShippingFrom?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
}
