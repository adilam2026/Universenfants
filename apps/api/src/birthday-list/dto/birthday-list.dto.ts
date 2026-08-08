import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsOptional, IsString, MinLength } from "class-validator";

export class CreateBirthdayListDto {
  @ApiProperty() @IsString() @MinLength(1) childName!: string;
  @ApiProperty() @IsDateString() eventDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() message?: string;
}

export class AddBirthdayListItemDto {
  @ApiProperty() @IsString() productId!: string;
}
