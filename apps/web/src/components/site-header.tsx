"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, Search, ShoppingBag, User, X, Gift, Cake, Tag, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCartCount } from "@/hooks/use-cart";

const QUICK_NAV = [
  { label: "Tous les jouets", href: "/recherche", strong: true },
  { label: "0-2 ans", href: "/recherche?ageMin=0&ageMax=2" },
  { label: "3-5 ans", href: "/recherche?ageMin=3&ageMax=5" },
  { label: "6-8 ans", href: "/recherche?ageMin=6&ageMax=8" },
  { label: "9-12 ans", href: "/recherche?ageMin=9&ageMax=12" },
  { label: "12 ans et +", href: "/recherche?ageMin=12" },
  { label: "🔥 Promotions", href: "/categorie/construction", accent: true },
];

const DRAWER_LINKS = [
  { label: "Jouets par âge", href: "/recherche", icon: Cake },
  { label: "Jouets par univers", href: "/categorie/construction", icon: ShoppingBag },
  { label: "Promotions", href: "/categorie/construction", icon: Tag, accent: true },
  { label: "Conseiller Cadeau", href: "/conseiller-cadeau", icon: Gift, brand: true },
  { label: "Liste anniversaire", href: "/liste-anniversaire", icon: Cake, brand: true },
  { label: "Mon compte", href: "/compte", icon: User },
  { label: "Contact", href: "/pages/contact", icon: Mail },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const cartCount = useCartCount();

  return (
    <>
      <div className="bg-brand-primary-strong text-primary-foreground text-center text-xs font-bold py-1.5 px-3">
        🚚 Livraison gratuite partout au Maroc dès <strong>400 DH</strong> d&apos;achat
      </div>

      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur border-b border-border">
        <div className="mx-auto max-w-6xl px-4 md:px-7">
          <div className="flex items-center gap-2 md:gap-4 py-2.5 md:py-3.5">
            <button
              className="md:hidden flex size-9 items-center justify-center rounded-full hover:bg-secondary"
              aria-label="Menu"
              onClick={() => setOpen(true)}
            >
              <Menu className="size-5" />
            </button>
            <Link href="/" className="hidden md:flex items-center font-display font-extrabold text-xl text-primary shrink-0">
              Univers<span className="text-brand-cta">Enfants</span>
            </Link>
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <input
                type="search"
                placeholder="Rechercher un jouet, une marque, un âge…"
                className="w-full rounded-full border-2 border-border bg-background py-3 pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <nav className="flex items-center gap-1 shrink-0">
              <Link
                href="/compte"
                className="hidden md:flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label="Mon compte"
              >
                <User className="size-[18px]" />
              </Link>
              <Link
                href="/panier"
                className="relative flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label="Panier"
              >
                <ShoppingBag className="size-[18px]" />
                {cartCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 flex min-w-[16px] h-4 items-center justify-center rounded-full bg-brand-cta px-1 text-[10px] font-extrabold text-brand-cta-foreground">
                    {cartCount}
                  </span>
                )}
              </Link>
            </nav>
          </div>

          <nav className="flex gap-2 overflow-x-auto pb-2.5 [scrollbar-width:none]">
            {QUICK_NAV.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-bold",
                  item.strong && "bg-primary text-primary-foreground",
                  item.accent && "bg-brand-cta-soft text-brand-cta-hover",
                  !item.strong && !item.accent && "bg-secondary text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Tiroir de navigation mobile */}
      <div
        className={cn(
          "fixed inset-0 z-[60] bg-foreground/40 transition-opacity md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setOpen(false)}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-[61] w-[82%] max-w-80 bg-card shadow-xl transition-transform md:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <span className="font-display font-extrabold text-lg text-primary">
            Univers<span className="text-brand-cta">Enfants</span>
          </span>
          <button
            className="flex size-9 items-center justify-center rounded-full hover:bg-secondary"
            aria-label="Fermer"
            onClick={() => setOpen(false)}
          >
            <X className="size-5" />
          </button>
        </div>
        <nav className="flex flex-col p-2">
          {DRAWER_LINKS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold hover:bg-secondary",
                item.brand && "text-primary",
                item.accent && "text-brand-cta-hover",
              )}
            >
              <item.icon className="size-[18px]" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Barre de navigation mobile basse */}
      <nav className="fixed bottom-0 inset-x-0 z-40 flex border-t border-border bg-card md:hidden">
        {[
          { href: "/", label: "Accueil", icon: ShoppingBag },
          { href: "/recherche", label: "Recherche", icon: Search },
          { href: "/conseiller-cadeau", label: "Cadeau", icon: Gift },
          { href: "/panier", label: "Panier", icon: ShoppingBag },
          { href: "/compte", label: "Compte", icon: User },
        ].map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-bold text-muted-foreground"
          >
            <item.icon className="size-5" />
            {item.label === "Panier" && cartCount > 0 && (
              <span className="absolute top-0.5 right-[28%] flex min-w-[14px] h-3.5 items-center justify-center rounded-full bg-brand-cta px-1 text-[9px] font-extrabold text-brand-cta-foreground">
                {cartCount}
              </span>
            )}
          </Link>
        ))}
      </nav>
    </>
  );
}
