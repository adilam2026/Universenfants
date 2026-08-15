import { ApiPropertyOptional, ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString, Matches, Max, Min } from "class-validator";

export class UpdateSettingsDto {
  // Fraction (0.2 = 20%), jamais un pourcentage brut — @Max(1) borne donc à
  // 100% de TVA. Sans ce plafond, une faute de frappe admin (ex : 5 au lieu
  // de 0.05) passait telle quelle et se répercutait sur tous les prix TTC
  // affichés/facturés côté boutique.
  @ApiProperty() @IsNumber() @Min(0) @Max(1) vatRate!: number;
  // >= 1, jamais 0 : ce taux est un diviseur (points fidélité par DH remisé)
  // dans order-pricing.util.ts#calculateLoyaltyRedemption — 0 y produirait
  // une remise fidélité égale au sous-total entier pour n'importe quel
  // client ayant ne serait-ce qu'un point (cf. le garde-fou ajouté côté
  // calcul, ici en complément pour empêcher la saisie même du côté admin).
  @ApiProperty() @IsNumber() @Min(1) loyaltyRedeemRate!: number;
  @ApiProperty() @IsNumber() @Min(0) freeShippingThreshold!: number;
  // Numéro affiché tel quel dans le lien wa.me (bouton "Commander via
  // WhatsApp" de la fiche produit) — chiffres uniquement, indicatif pays
  // inclus (ex : 212600000000), jamais de "+" ni d'espaces au format wa.me.
  // Optionnel et distinct de WHATSAPP_PHONE_NUMBER_ID (identifiant technique
  // Meta Graph API pour l'envoi des OTP, non lisible par un humain).
  // Chaîne vide acceptée : c'est le moyen de retirer le numéro déjà
  // enregistré (masque à nouveau le bouton WhatsApp côté boutique).
  @ApiPropertyOptional() @IsOptional() @IsString() @Matches(/^(\d{6,15})?$/, { message: "Numéro WhatsApp invalide (chiffres uniquement, indicatif pays inclus)" })
  whatsappOrderNumber?: string;
}
