import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MinLength } from "class-validator";

export class UpdateProfileDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) lastName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) phone?: string;
  // Requis uniquement si `phone` change réellement (voir customer-auth.service.ts#updateProfile) :
  // le téléphone double comme identifiant de connexion (detectIdentifierKind),
  // donc le modifier mérite la même ré-authentification que l'email.
  @ApiPropertyOptional() @IsOptional() @IsString() password?: string;
}
