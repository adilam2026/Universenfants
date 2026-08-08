import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import { LANDING_TEMPLATES, LANDING_THEMES } from "@universenfants/shared";

export class UpsertLandingPageDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() slug!: string;
  @ApiProperty() @IsString() productId!: string;

  @ApiProperty({ enum: LANDING_TEMPLATES }) @IsIn(LANDING_TEMPLATES) template!: string;
  @ApiProperty({ enum: LANDING_THEMES }) @IsIn(LANDING_THEMES) theme!: string;

  // Type `unknown`, pas `LandingPageBlock[]` : avec
  // transformOptions.enableImplicitConversion (main.ts), class-transformer
  // lit le design:type réfléchi par TS pour ce champ — pour un tableau
  // typé, ça vaut `Array`, et sa conversion implicite écrase chaque objet
  // du tableau par un tableau vide (LandingPageBlock est une interface, pas
  // une classe qu'il peut reconstruire). Un design:type `Object` (ce que TS
  // émet pour `unknown`) évite complètement ce chemin de conversion.
  @ApiProperty({ type: "array" })
  @IsArray()
  blocks!: unknown;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) displayPrice?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) compareAtPrice?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() primaryColor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() secondaryColor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ctaColor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ctaLabel?: string;

  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() countdownEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsDateString() countdownStartAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() countdownEndAt?: string;

  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() requireAddress?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsString() successPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() successWhatsapp?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() successHours?: string;

  @ApiPropertyOptional({ enum: ["DRAFT", "ACTIVE", "ARCHIVED"] })
  @IsOptional()
  @IsIn(["DRAFT", "ACTIVE", "ARCHIVED"])
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
}
