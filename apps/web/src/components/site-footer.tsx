"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function SiteFooter() {
  const t = useTranslations("footer");

  const COLUMNS = [
    {
      title: t("shop"),
      links: [
        { label: t("catalog"), href: "/recherche" },
        { label: t("promotions"), href: "/recherche?promo=1" },
        { label: t("newArrivals"), href: "/recherche?sort=newest" },
      ],
    },
    {
      title: t("help"),
      links: [
        { label: t("faq"), href: "/pages/faq" },
        { label: t("shipping"), href: "/pages/livraison" },
        { label: t("contact"), href: "/pages/contact" },
      ],
    },
    {
      title: t("company"),
      links: [
        { label: t("about"), href: "/pages/apropos" },
        { label: t("terms"), href: "/pages/cgv" },
        { label: t("privacy"), href: "/pages/confidentialite" },
        { label: t("returns"), href: "/pages/retour" },
      ],
    },
  ];

  return (
    <footer className="mt-10 bg-brand-primary-strong text-primary-foreground">
      <div className="mx-auto max-w-6xl px-4 md:px-7 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h5 className="text-sm font-bold mb-3">{col.title}</h5>
            <ul className="space-y-2">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-primary-foreground/75 hover:text-primary-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <h5 className="text-sm font-bold mb-3">{t("followUs")}</h5>
          <ul className="space-y-2 text-sm text-primary-foreground/75">
            <li>Instagram</li>
            <li>Facebook</li>
            <li>TikTok</li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
