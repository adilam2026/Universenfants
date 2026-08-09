import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, Min } from "class-validator";

export class UpdateSettingsDto {
  @ApiProperty() @IsNumber() @Min(0) vatRate!: number;
  // >= 1, jamais 0 : ce taux est un diviseur (points fidélité par DH remisé)
  // dans order-pricing.util.ts#calculateLoyaltyRedemption — 0 y produirait
  // une remise fidélité égale au sous-total entier pour n'importe quel
  // client ayant ne serait-ce qu'un point (cf. le garde-fou ajouté côté
  // calcul, ici en complément pour empêcher la saisie même du côté admin).
  @ApiProperty() @IsNumber() @Min(1) loyaltyRedeemRate!: number;
  @ApiProperty() @IsNumber() @Min(0) freeShippingThreshold!: number;
}
