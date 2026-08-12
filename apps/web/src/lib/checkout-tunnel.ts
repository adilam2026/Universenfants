// Un seul et même critère utilisé à la fois par le header (masquage de la
// navigation catalogue) et par le layout (espace réservé à la barre de
// navigation mobile basse) — évite que les deux se désynchronisent si le
// tunnel de commande s'étend un jour à d'autres routes.
export function isCheckoutTunnelPath(pathname: string): boolean {
  return pathname === "/checkout";
}
