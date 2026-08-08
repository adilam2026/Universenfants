import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, Min } from "class-validator";

export class UpdateSettingsDto {
  @ApiProperty() @IsNumber() @Min(0) vatRate!: number;
  @ApiProperty() @IsNumber() @Min(0) loyaltyRedeemRate!: number;
  @ApiProperty() @IsNumber() @Min(0) freeShippingThreshold!: number;
}
