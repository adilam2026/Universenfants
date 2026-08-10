import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsString, Matches } from "class-validator";

export class CreateRoleDto {
  // MAJUSCULES_SNAKE_CASE : sert d'identifiant stable (comme les rôles seedés
  // SUPER_ADMIN, CATALOG_MANAGER...), jamais affiché tel quel à l'utilisateur.
  @ApiProperty() @IsString() @Matches(/^[A-Z][A-Z0-9_]*$/, { message: "code doit être en MAJUSCULES_SNAKE_CASE" }) code!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) permissionCodes!: string[];
}
