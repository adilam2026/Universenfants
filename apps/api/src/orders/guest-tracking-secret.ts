// Secret dédié au token de suivi invité — jamais JWT_ACCESS_SECRET (voir
// GuestOrderTrackingGuard). Repli de développement uniquement, comme
// JWT_ACCESS_SECRET dans jwt.strategy.ts ; JWT_GUEST_TRACKING_SECRET doit
// être défini en production.
export const GUEST_TRACKING_SECRET = process.env.JWT_GUEST_TRACKING_SECRET ?? "dev-guest-tracking-secret";
