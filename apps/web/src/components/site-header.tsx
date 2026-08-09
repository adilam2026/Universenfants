"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Menu, Search, ShoppingBag, User, X, Gift, Cake, Tag, Mail, Languages, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCartCount } from "@/hooks/use-cart";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { SearchForm, SearchFormFallback } from "@/components/search-form";

export function SiteHeader() {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const cartCount = useCartCount();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  // Le tiroir mobile n'avait ni piège à focus ni fermeture au clavier (Échap) :
  // au clavier, Tab continuait de traverser les éléments du header masqué
  // derrière l'overlay au lieu de rester dans le tiroir ouvert, le rendant
  // impossible à utiliser sans souris.
  useEffect(() => {
    if (!open) return;
    const menuButton = menuButtonRef.current;
    closeButtonRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key !== "Tab" || !drawerRef.current) return;
      const focusable = drawerRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      menuButton?.focus();
    };
  }, [open]);

  const QUICK_NAV: { label: string; href: Parameters<typeof Link>[0]["href"]; strong?: boolean; accent?: boolean }[] = [
    { label: t("nav.allToys"), href: "/recherche", strong: true },
    { label: t("nav.age0to2"), href: "/recherche?ageMin=0&ageMax=2" },
    { label: t("nav.age3to5"), href: "/recherche?ageMin=3&ageMax=5" },
    { label: t("nav.age6to8"), href: "/recherche?ageMin=6&ageMax=8" },
    { label: t("nav.age9to12"), href: "/recherche?ageMin=9&ageMax=12" },
    { label: t("nav.age12plus"), href: "/recherche?ageMin=12" },
    { label: t("nav.promotions"), href: "/recherche?promo=1", accent: true },
  ];

  const DRAWER_LINKS: {
    label: string;
    href: Parameters<typeof Link>[0]["href"];
    icon: typeof Cake;
    brand?: boolean;
    accent?: boolean;
  }[] = [
    { label: t("nav.toysByAge"), href: "/recherche", icon: Cake },
    { label: t("nav.toysByUniverse"), href: "/categorie/construction", icon: ShoppingBag },
    { label: t("nav.promotions"), href: "/recherche?promo=1", icon: Tag, accent: true },
    { label: t("nav.giftAdvisor"), href: "/conseiller-cadeau", icon: Gift, brand: true },
    { label: t("nav.birthdayList"), href: "/liste-anniversaire", icon: Cake, brand: true },
    { label: t("wishlist.title"), href: "/favoris", icon: Heart },
    { label: t("nav.myAccount"), href: "/compte", icon: User },
    { label: t("nav.contact"), href: "/pages/contact", icon: Mail },
  ];

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
              ref={menuButtonRef}
              className="md:hidden flex size-9 items-center justify-center rounded-full hover:bg-secondary"
              aria-label={t("nav.menu")}
              onClick={() => setOpen(true)}
            >
              <Menu className="size-5" />
            </button>
            <Link href="/" dir="ltr" className="hidden md:flex items-center font-display font-extrabold text-xl text-primary shrink-0">
              Univers<span className="text-brand-cta">Enfants</span>
            </Link>
            <Suspense fallback={<SearchFormFallback />}>
              <SearchForm />
            </Suspense>
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
                href="/favoris"
                className="hidden md:flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label={t("wishlist.title")}
              >
                <Heart className="size-[18px]" />
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
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("nav.menu")}
        className={cn(
          "fixed inset-y-0 start-0 z-[61] w-[82%] max-w-80 bg-card shadow-xl transition-transform md:hidden",
          open ? "translate-x-0" : "-translate-x-full rtl:translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <span dir="ltr" className="font-display font-extrabold text-lg text-primary">
            Univers<span className="text-brand-cta">Enfants</span>
          </span>
          <button
            ref={closeButtonRef}
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
