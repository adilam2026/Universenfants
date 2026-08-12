"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { useIsLoggedIn } from "@/hooks/use-is-logged-in";

// Un client connecté retrouve sa commande dans son espace (comportement
// inchangé) ; un invité ne doit jamais être poussé vers /compte/commandes
// (implique une connexion) — direction vers le suivi par OTP WhatsApp à la
// place, numéro de commande déjà pré-rempli. `useIsLoggedIn` (pas
// `isLoggedIn()` en lecture directe) : évite un mismatch d'hydratation et
// se corrige automatiquement une fois le vrai statut connu côté client.
export function TrackOrderButton({ orderNumber }: { orderNumber: string | null }) {
  const t = useTranslations("confirmation");
  const loggedIn = useIsLoggedIn();
  const guestHref = orderNumber ? `/suivi-commande?orderNumber=${encodeURIComponent(orderNumber)}` : "/suivi-commande";
  const href = loggedIn ? "/compte/commandes" : guestHref;

  return (
    <Button asChild>
      <Link href={href}>{t("trackOrder")}</Link>
    </Button>
  );
}
