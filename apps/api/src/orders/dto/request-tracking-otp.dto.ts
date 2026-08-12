import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class RequestTrackingOtpDto {
  @ApiProperty() @IsString() @MinLength(5) orderNumber!: string;
}
