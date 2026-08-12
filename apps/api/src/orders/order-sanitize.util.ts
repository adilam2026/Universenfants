// Extrait de OrdersService (était une méthode privée) pour être réutilisable
// par OrderTrackingService : le suivi invité doit renvoyer exactement la
// même forme de commande que /orders/:id (JwtAuthGuard), jamais le coût
// d'achat interne (costPriceSnapshot).
export function sanitizeOrderForCustomer<T extends { lines: { costPriceSnapshot: unknown }[] }>(order: T) {
  return { ...order, lines: order.lines.map(({ costPriceSnapshot: _omit, ...line }) => line) };
}
