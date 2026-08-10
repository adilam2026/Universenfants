import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString, Min } from "class-validator";

export class UpsertCityGroupDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsNumber() @Min(0) shippingFee!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) freeShippingFrom?: number;
}
