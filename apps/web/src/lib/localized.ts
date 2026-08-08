/** Retourne le champ localisé (nameAr, longDescAr, …) s'il existe, sinon la valeur FR. */
export function localized(fr: string, ar: string | null | undefined, locale: string): string {
  return locale === "ar" && ar ? ar : fr;
}
