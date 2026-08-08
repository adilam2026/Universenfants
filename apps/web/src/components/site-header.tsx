"use client";

import { useState, type FormEvent } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Menu, Search, ShoppingBag, User, X, Gift, Cake, Tag, Mail, Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCartCount } from "@/hooks/use-cart";
import { Link, usePathname, useRouter } from "@/i18n/navigation";

export function SiteHeader() {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const cartCount = useCartCount();

  function handleSearchSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/recherche?q=${encodeURIComponent(trimmed)}` : "/recherche");
  }

  const QUICK_NAV = [
    { label: t("nav.allToys"), href: "/recherche", strong: true },
    { label: t("nav.age0to2"), href: "/recherche?ageMin=0&ageMax=2" },
    { label: t("nav.age3to5"), href: "/recherche?ageMin=3&ageMax=5" },
    { label: t("nav.age6to8"), href: "/recherche?ageMin=6&ageMax=8" },
    { label: t("nav.age9to12"), href: "/recherche?ageMin=9&ageMax=12" },
    { label: t("nav.age12plus"), href: "/recherche?ageMin=12" },
    { label: t("nav.promotions"), href: "/categorie/construction", accent: true },
  ] as const;

  const DRAWER_LINKS = [
    { label: t("nav.toysByAge"), href: "/recherche", icon: Cake },
    { label: t("nav.toysByUniverse"), href: "/categorie/construction", icon: ShoppingBag },
    { label: t("nav.promotions"), href: "/categorie/construction", icon: Tag, accent: true },
    { label: t("nav.giftAdvisor"), href: "/conseiller-cadeau", icon: Gift, brand: true },
    { label: t("nav.birthdayList"), href: "/liste-anniversaire", icon: Cake, brand: true },
    { label: t("nav.myAccount"), href: "/compte", icon: User },
    { label: t("nav.contact"), href: "/pages/contact", icon: Mail },
  ] as const;

  function switchLocale(next: string) {
    router.replace(pathname, { locale: next });
  }

  return (
    <>
      <div className="bg-brand-primary-strong text-primary-foreground text-center text-xs font-bold py-1.5 px-3">
        {t.rich("promoBar.text", { amount: 400, strong: (chunks) => <strong>{chunks}</strong> })}
      </div>

      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur border-b border-border">
        <div className="mx-auto max-w-6xl px-4 md:px-7">
          <div className="flex items-center gap-2 md:gap-4 py-2.5 md:py-3.5">
            <button
              className="md:hidden flex size-9 items-center justify-center rounded-full hover:bg-secondary"
              aria-label={t("nav.menu")}
              onClick={() => setOpen(true)}
            >
              <Menu className="size-5" />
            </button>
            <Link href="/" className="hidden md:flex items-center font-display font-extrabold text-xl text-primary shrink-0">
              Univers<span className="text-brand-cta">Enfants</span>
            </Link>
            <form onSubmit={handleSearchSubmit} className="relative flex-1">
              <Search className="absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("nav.searchPlaceholder")}
                className="w-full rounded-full border-2 border-border bg-background py-3 pl-10 pr-4 rtl:pl-4 rtl:pr-10 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </form>
            <nav className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => switchLocale(locale === "fr" ? "ar" : "fr")}
                className="flex h-9 items-center justify-center gap-1 rounded-full px-2.5 text-xs font-bold text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label="Switch language"
              >
                <Languages className="size-[18px]" />
                {locale === "fr" ? "AR" : "FR"}
              </button>
              <Link
                href="/compte"
                className="hidden md:flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label={t("nav.myAccount")}
              >
                <User className="size-[18px]" />
              </Link>
              <Link
                href="/panier"
                className="relative flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label={t("nav.cart")}
              >
                <ShoppingBag className="size-[18px]" />
                {cartCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 rtl:right-auto rtl:left-0.5 flex min-w-[16px] h-4 items-center justify-center rounded-full bg-brand-cta px-1 text-[10px] font-extrabold text-brand-cta-foreground">
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
          "fixed inset-y-0 start-0 z-[61] w-[82%] max-w-80 bg-card shadow-xl transition-transform md:hidden",
          open ? "translate-x-0" : "-translate-x-full rtl:translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <span className="font-display font-extrabold text-lg text-primary">
            Univers<span className="text-brand-cta">Enfants</span>
          </span>
          <button
            className="flex size-9 items-center justify-center rounded-full hover:bg-secondary"
            aria-label={t("nav.close")}
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
          { href: "/", label: t("nav.home"), icon: ShoppingBag },
          { href: "/recherche", label: t("nav.search"), icon: Search },
          { href: "/conseiller-cadeau", label: t("nav.gift"), icon: Gift },
          { href: "/panier", label: t("nav.cart"), icon: ShoppingBag },
          { href: "/compte", label: t("nav.account"), icon: User },
        ].map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-bold text-muted-foreground"
          >
            <item.icon className="size-5" />
            {item.label === t("nav.cart") && cartCount > 0 && (
              <span className="absolute top-0.5 right-[28%] rtl:right-auto rtl:left-[28%] flex min-w-[14px] h-3.5 items-center justify-center rounded-full bg-brand-cta px-1 text-[9px] font-extrabold text-brand-cta-foreground">
                {cartCount}
              </span>
            )}
          </Link>
        ))}
      </nav>
    </>
  );
}
