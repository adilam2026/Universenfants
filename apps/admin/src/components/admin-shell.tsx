"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  PackageSearch,
  Upload,
  ShoppingCart,
  Users,
  Tag,
  Ticket,
  Star,
  Truck,
  LineChart,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { clearSession, getStaffToken, getStaffUser, type StaffUser } from "@/lib/api-client";

const NAV = [
  {
    group: "Pilotage",
    items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    group: "Catalogue",
    items: [
      { href: "/produits", label: "Produits", icon: PackageSearch },
      { href: "/import", label: "Import Excel", icon: Upload },
    ],
  },
  {
    group: "Ventes",
    items: [
      { href: "/commandes", label: "Commandes", icon: ShoppingCart },
      { href: "/clients", label: "Clients", icon: Users },
    ],
  },
  {
    group: "Marketing",
    items: [
      { href: "/promotions", label: "Promotions", icon: Tag },
      { href: "/coupons", label: "Coupons", icon: Ticket },
      { href: "/avis", label: "Avis", icon: Star },
    ],
  },
  {
    group: "Logistique",
    items: [{ href: "/livraison", label: "Livraison", icon: Truck }],
  },
  {
    group: "Pilotage avancé",
    items: [{ href: "/analytics", label: "Analytics", icon: LineChart }],
  },
  {
    group: "Administration",
    items: [{ href: "/parametres", label: "Paramètres", icon: Settings }],
  },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<StaffUser | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!getStaffToken()) {
      router.replace("/login");
      return;
    }
    setUser(getStaffUser());
    setChecked(true);
  }, [router]);

  if (!checked) return null;

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 border-r border-border bg-card flex flex-col">
        <div className="px-4 py-4 border-b border-border">
          <span className="font-bold text-lg text-primary">
            Univers<span className="text-brand-cta">Enfants</span>
          </span>
          <p className="text-[11px] text-muted-foreground mt-0.5">Back-Office</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-3">
          {NAV.map((group) => (
            <div key={group.group} className="mb-4">
              <p className="px-4 mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {group.group}
              </p>
              {group.items.map((item) => {
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
          ))}
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
              onClick={() => { clearSession(); router.replace("/login"); }}
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-destructive"
              aria-label="Déconnexion"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <div className="p-6 max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
