"use client";

import { usePathname } from "@/i18n/navigation";
import { isCheckoutTunnelPath } from "@/lib/checkout-tunnel";
import { cn } from "@/lib/utils";

// L'espace réservé en bas de page (padding) correspond exactement à la
// barre de navigation mobile basse masquée par <SiteHeader> dans le tunnel
// de commande — sans ce composant, /checkout garderait un vide en bas
// d'écran sur mobile là où la barre ne s'affiche plus.
export function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isCheckoutTunnel = isCheckoutTunnelPath(pathname);

  return (
    <main className={cn("flex-1 md:pb-0", !isCheckoutTunnel && "pb-[calc(5rem+env(safe-area-inset-bottom))]")}>
      {children}
    </main>
  );
}
