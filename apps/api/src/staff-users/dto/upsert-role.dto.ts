import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsString } from "class-validator";

export class UpsertRoleDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) permissionCodes!: string[];
}
