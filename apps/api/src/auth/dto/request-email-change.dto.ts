import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString } from "class-validator";

export class RequestEmailChangeDto {
  @ApiProperty() @IsEmail() newEmail!: string;
  // Ré-authentification requise : sans ce garde-fou, une session volée
  // (token XSS, appareil laissé déverrouillé) suffirait à rediriger
  // silencieusement tous les futurs liens de réinitialisation de mot de
  // passe vers une adresse contrôlée par l'attaquant.
  @ApiProperty() @IsString() password!: string;
}
