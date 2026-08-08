import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsEmail, IsOptional, IsString } from "class-validator";

// Champs par défaut du formulaire de checkout (§27 BO-27 Paramètres Checkout
// définit lesquels sont visibles/obligatoires — nom, téléphone, ville, adresse
// obligatoires ; email optionnel, cf. maquette).
export class CheckoutDto {
  @ApiProperty() @IsString() firstName!: string;
  @ApiProperty() @IsString() lastName!: string;
  @ApiProperty() @IsString() phone!: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;

  @ApiProperty() @IsString() city!: string;
  @ApiProperty() @IsString() addressLine!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() comment?: string;

  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() useLoyaltyPoints?: boolean;
}
