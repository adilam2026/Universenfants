import Link from "next/link";

const COLUMNS = [
  {
    title: "Boutique",
    links: [
      { label: "Catalogue", href: "/recherche" },
      { label: "Promotions", href: "/categorie/construction" },
      { label: "Nouveautés", href: "/recherche" },
    ],
  },
  {
    title: "Aide",
    links: [
      { label: "FAQ", href: "/pages/faq" },
      { label: "Livraison", href: "/pages/livraison" },
      { label: "Contact", href: "/pages/contact" },
    ],
  },
  {
    title: "Société",
    links: [
      { label: "Qui sommes-nous", href: "/pages/apropos" },
      { label: "CGV", href: "/pages/cgv" },
      { label: "Confidentialité (loi 09-08)", href: "/pages/confidentialite" },
      { label: "Politique de retour", href: "/pages/retour" },
    ],
  },
];

export function SiteFooter() {
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
          <h5 className="text-sm font-bold mb-3">Suivez-nous</h5>
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
