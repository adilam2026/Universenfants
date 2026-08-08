import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsInt, IsOptional, IsString } from "class-validator";

export class AdjustStockDto {
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string;
  @ApiProperty({ description: "Delta appliqué au stock (peut être négatif)" }) @IsInt() delta!: number;
  @ApiProperty({
    enum: ["SUPPLIER_RECEIPT", "INVENTORY_CORRECTION", "RETURN"],
  })
  @IsIn(["SUPPLIER_RECEIPT", "INVENTORY_CORRECTION", "RETURN"])
  reason!: "SUPPLIER_RECEIPT" | "INVENTORY_CORRECTION" | "RETURN";
}
