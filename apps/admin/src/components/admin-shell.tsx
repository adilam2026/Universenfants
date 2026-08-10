"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  PackageSearch,
  Boxes,
  Upload,
  ShoppingCart,
  Users,
  Tag,
  Ticket,
  Star,
  Rocket,
  Truck,
  LineChart,
  Settings,
  LogOut,
  ScrollText,
  FolderTree,
  BadgeCheck,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { staffLogout, getStaffToken } from "@/lib/api-client";
import { useStaffUser } from "@/hooks/use-staff-user";

// `permission` reflète exactement le garde serveur (@RequirePermissions) de
// la route GET/liste de chaque section — sans ça, un membre du staff sans le
// droit correspondant voyait le lien, cliquait, et ne découvrait qu'à ce
// moment-là (ou pire, à la soumission d'un formulaire) qu'il n'y avait pas
// accès. Omis (page visible à tout le monde) quand la route de lecture
// elle-même n'a aucun @RequirePermissions (Dashboard, Paramètres en lecture).
interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission: string | null;
}

const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Pilotage",
    items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard, permission: null }],
  },
  {
    group: "Catalogue",
    items: [
      { href: "/produits", label: "Produits", icon: PackageSearch, permission: "product.read" },
      { href: "/stock", label: "Stock", icon: Boxes, permission: "product.read" },
      { href: "/categories", label: "Catégories", icon: FolderTree, permission: "product.read" },
      { href: "/marques", label: "Marques", icon: BadgeCheck, permission: "product.read" },
      { href: "/import", label: "Import Excel", icon: Upload, permission: "product.create" },
    ],
  },
  {
    group: "Ventes",
    items: [
      { href: "/commandes", label: "Commandes", icon: ShoppingCart, permission: "order.read" },
      { href: "/clients", label: "Clients", icon: Users, permission: "customer.read" },
    ],
  },
  {
    group: "Marketing",
    items: [
      { href: "/promotions", label: "Promotions", icon: Tag, permission: "promotion.create" },
      { href: "/coupons", label: "Coupons", icon: Ticket, permission: "coupon.create" },
      { href: "/avis", label: "Avis", icon: Star, permission: "product.update" },
      { href: "/landing-pages", label: "Landing Pages", icon: Rocket, permission: "promotion.create" },
    ],
  },
  {
    group: "Logistique",
    items: [{ href: "/livraison", label: "Livraison", icon: Truck, permission: "shipping.read" }],
  },
  {
    group: "Pilotage avancé",
    items: [{ href: "/analytics", label: "Analytics", icon: LineChart, permission: "analytics.read" }],
  },
  {
    group: "Administration",
    items: [
      { href: "/parametres", label: "Paramètres", icon: Settings, permission: null },
      { href: "/audit-logs", label: "Journal d'audit", icon: ScrollText, permission: "user.manage" },
    ],
  },
];

const FLAT_NAV = NAV.flatMap((g) => g.items);

// Masquer le lien dans la sidebar ne suffit pas : un membre du staff qui
// tape ou a en favori l'URL directe d'une page à laquelle il n'a pas droit
// devait jusqu'ici pouvoir l'ouvrir et interagir avec le formulaire, pour ne
// découvrir le refus qu'à la soumission (réponse 403 de l'API). On applique
// donc la même carte href → permission ici, au niveau layout, en trouvant la
// section NAV la plus spécifique dont l'URL courante est un sous-chemin
// (ex: /produits/abc123 relève de la même permission que /produits).
function permissionForPath(pathname: string): string | null {
  const candidates = FLAT_NAV.filter((item) => (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)));
  const mostSpecific = candidates.sort((a, b) => b.href.length - a.href.length)[0];
  return mostSpecific ? mostSpecific.permission : null;
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useStaffUser();
  // Sous `lg`, la sidebar est un tiroir hors-écran plutôt qu'une colonne
  // fixe de 240px — sans ça elle prenait une part disproportionnée de la
  // largeur sur mobile et le contenu (tableaux, formulaires) se retrouvait
  // écrasé dans le reste, sans aucun moyen de la masquer.
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // Le tiroir mobile doit se refermer après un clic sur un lien. Ajusté
  // pendant le rendu plutôt que dans un effet (voir la doc React sur
  // "adjusting state when a prop changes") : un effet créerait un rendu
  // intermédiaire visible où l'ancienne page reste affichée tiroir ouvert
  // avant de se refermer au rendu suivant.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileNavOpen(false);
  }

  // Vérifie le token directement plutôt que de dépendre de `user` : sur une
  // navigation complète, useSyncExternalStore rend d'abord la valeur serveur
  // (null) le temps de l'hydratation avant de se resynchroniser au rendu
  // suivant — un effet dépendant de `user` s'exécuterait sur cette valeur
  // transitoire et redirigerait à tort vers /login à chaque rechargement.
  useEffect(() => {
    if (!getStaffToken()) router.replace("/login");
  }, [router]);

  if (!user) return null;

  const requiredPermission = permissionForPath(pathname);
  const denied = requiredPermission !== null && !(user.permissions ?? []).includes(requiredPermission);

  return (
    <div className="flex min-h-screen">
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          "w-60 shrink-0 border-r border-border bg-card flex flex-col h-screen z-40",
          "fixed inset-y-0 left-0 rtl:left-auto rtl:right-0 transition-transform lg:sticky lg:top-0 lg:translate-x-0",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full",
        )}
      >
        <div className="px-4 py-4 border-b border-border flex items-center justify-between">
          <div>
            <span className="font-bold text-lg text-primary">
              Univers<span className="text-brand-cta">Enfants</span>
            </span>
            <p className="text-[11px] text-muted-foreground mt-0.5">Back-Office</p>
          </div>
          <button
            onClick={() => setMobileNavOpen(false)}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary lg:hidden"
            aria-label="Fermer le menu"
          >
            <X className="size-4" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-3">
          {NAV.map((group) => {
            const visibleItems = group.items.filter(
              (item) => item.permission === null || (user.permissions ?? []).includes(item.permission),
            );
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.group} className="mb-4">
                <p className="px-4 mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {group.group}
                </p>
                {visibleItems.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 px-4 py-2 text-sm font-medium",
                        active ? "bg-brand-primary-soft text-primary border-r-2 border-primary" : "text-foreground/80 hover:bg-secondary",
                      )}
                    >
                      <item.icon className="size-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2.5 px-1 py-1.5">
            <div className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
              {user?.name?.slice(0, 2).toUpperCase() ?? "??"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold truncate">{user?.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">{user?.role}</p>
            </div>
            <button
              onClick={() => { staffLogout(); router.replace("/login"); }}
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-destructive"
              aria-label="Déconnexion"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="lg:hidden sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-card px-4 py-3">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary"
            aria-label="Ouvrir le menu"
          >
            <Menu className="size-5" />
          </button>
          <span className="font-bold text-primary">
            Univers<span className="text-brand-cta">Enfants</span>
          </span>
        </div>
        <main className="flex-1 min-w-0 overflow-x-hidden">
          <div className="p-4 sm:p-6 max-w-6xl mx-auto">
            {denied ? (
              <div className="rounded-lg border border-border bg-card p-6 text-center">
                <p className="font-bold mb-1">Accès refusé</p>
                <p className="text-sm text-muted-foreground">Votre rôle ne vous donne pas accès à cette section du Back-Office.</p>
              </div>
            ) : (
              children
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
