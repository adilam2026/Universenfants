import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

/** Identifiant unique = email OU téléphone, détecté automatiquement (I2). */
export class LoginDto {
  @ApiProperty({ example: "salma@example.com ou 0661223344" })
  @IsString()
  identifier!: string;

  @ApiProperty() @IsString() @MinLength(1) password!: string;
}
