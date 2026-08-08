import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString } from "class-validator";

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: ["CONFIRMED", "PREPARING", "SHIPPED", "DELIVERED", "CANCELLED"] })
  @IsIn(["CONFIRMED", "PREPARING", "SHIPPED", "DELIVERED", "CANCELLED"])
  status!: "CONFIRMED" | "PREPARING" | "SHIPPED" | "DELIVERED" | "CANCELLED";

  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

export class RecordPaymentDto {
  @ApiProperty() amount!: number;
}
