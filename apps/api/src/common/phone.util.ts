// Les numéros sont saisis par les clients sous forme locale marocaine
// ("06 12 34 56 78", "0612345678"...) alors que l'API WhatsApp Cloud exige
// le format E.164 sans "+" (ex. "212612345678"). Une seule normalisation
// partagée évite que le format diverge entre le point d'envoi de l'OTP et
// une éventuelle comparaison/recherche par téléphone.
export function normalizeMoroccanPhone(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.startsWith("212")) return digits;
  if (digits.startsWith("0")) return `212${digits.slice(1)}`;
  return digits;
}

// Jamais le numéro complet à l'écran (§ consigne OTP) — seuls les 4 derniers
// chiffres, le reste remplacé par des points, quel que soit le format
// d'origine (local ou déjà normalisé).
export function maskPhone(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  const last4 = digits.slice(-4);
  return `•••• ${last4}`;
}
