import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length, MinLength } from "class-validator";

export class VerifyTrackingOtpDto {
  @ApiProperty() @IsString() @MinLength(5) orderNumber!: string;
  @ApiProperty() @IsString() @Length(6, 6) code!: string;
}
