"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Minus, Plus } from "lucide-react";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { WishlistButton } from "@/components/wishlist-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { localized } from "@/lib/localized";
import { useStoreSettings } from "@/hooks/use-store-settings";
import type { ProductDetail } from "@/lib/api";

function dh(value: string | number) {
  return `${Number(value).toLocaleString("fr-FR")} DH`;
}

// Pas d'icône WhatsApp dans lucide-react (jeu d'icônes générique, pas de
// logos de marque) — repris ici en SVG inline pour une identité visuelle
// immédiatement reconnaissable, comme demandé, plutôt qu'une icône générique
// (bulle de dialogue) qui ne signalerait pas clairement "WhatsApp".
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.39 1.26 4.81L2 22l5.44-1.36a9.9 9.9 0 0 0 4.6 1.14h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm0 18.06a8.2 8.2 0 0 1-4.17-1.14l-.3-.18-3.12.78.83-3.04-.2-.31a8.15 8.15 0 0 1-1.25-4.3c0-4.51 3.67-8.18 8.19-8.18 2.18 0 4.24.85 5.78 2.4a8.12 8.12 0 0 1 2.4 5.79c0 4.51-3.67 8.18-8.16 8.18Zm4.48-6.13c-.24-.12-1.44-.71-1.67-.8-.22-.08-.38-.12-.55.12-.16.24-.63.8-.77.96-.14.16-.28.18-.53.06-.24-.12-1.02-.38-1.95-1.2-.72-.64-1.2-1.43-1.35-1.67-.14-.24-.02-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.32-.75-1.81-.2-.48-.4-.41-.55-.42-.14-.01-.3-.01-.46-.01-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.13 3.64.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28Z" />
    </svg>
  );
}

// Deux chemins d'achat, jamais trois : "Ajouter au panier" est l'action
// e-commerce principale (bouton plein, en tête) ; "Commander via WhatsApp"
// est une alternative clairement secondaire (bouton en contour, en dessous)
// pour le client qui préfère échanger avant de commander. Pas de "Acheter
// maintenant" — un tel raccourci multiplierait les chemins de conversion
// concurrents alors que la consigne est de les limiter à ces deux-là.
export function ProductPurchasePanel({ product }: { product: ProductDetail }) {
  const t = useTranslations("product");
  const locale = useLocale();
  const storeSettings = useStoreSettings();
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(product.variants[0]?.id ?? null);
  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId) ?? null;
  const [quantity, setQuantity] = useState(1);
  // Reste vrai jusqu'à ce que le client choisisse explicitement une suite
  // (continuer à naviguer ou voir le panier) plutôt que de se refermer tout
  // seul après un court délai — le temps de lire et cliquer varie trop d'un
  // client à l'autre pour un timer fixe.
  const [justAdded, setJustAdded] = useState(false);

  const price = selectedVariant?.price ?? product.promoPrice ?? product.price;
  const hasPromo = !selectedVariant?.price && product.promoPrice !== null;
  const available = selectedVariant ? selectedVariant.available : product.available;
  const stockLabel = available <= 0 ? t("outOfStock") : available <= 3 ? t("lowStock", { n: available }) : t("inStock");

  // Numéro configuré par l'admin (Paramètres globaux) — absent tant que
  // personne ne l'a saisi, ce qui masque proprement le bouton plutôt que
  // d'afficher un lien WhatsApp cassé.
  const waNumber = storeSettings?.settings.whatsappOrderNumber;
  const waHref = waNumber
    ? `https://wa.me/${waNumber}?text=${encodeURIComponent(
        t("whatsappOrderMessage", {
          name: localized(product.nameFr, product.nameAr, locale),
          sku: selectedVariant?.sku ?? product.sku,
          qty: quantity,
          url: typeof window !== "undefined" ? window.location.href : "",
        }),
      )}`
    : null;

  return (
    <div>
      <div className="flex items-baseline gap-3 mt-4">
        <span className="font-display text-3xl font-extrabold">{dh(price)}</span>
        {hasPromo && (
          <>
            <span className="text-lg text-muted-foreground line-through">{dh(product.price)}</span>
            <Badge variant="cta">-{Math.round((1 - Number(product.promoPrice) / Number(product.price)) * 100)}%</Badge>
          </>
        )}
      </div>

      <p
        className="mt-3 text-sm font-bold"
        style={{ color: available <= 0 ? "var(--destructive)" : available <= 3 ? "var(--brand-warning)" : "var(--brand-success)" }}
      >
        {stockLabel}
      </p>

      {product.variants.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-bold uppercase text-muted-foreground mb-1.5">{t("variant")}</p>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedVariantId(v.id)}
                disabled={v.available <= 0}
                className={cn(
                  "rounded-full border-[1.5px] px-4 py-1.5 text-sm font-semibold transition-colors disabled:opacity-40 disabled:line-through",
                  v.id === selectedVariantId
                    ? "border-brand-cta bg-brand-cta text-brand-cta-foreground"
                    : "border-border bg-transparent text-foreground hover:bg-secondary",
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {available > 0 && (
        <div className="mt-4">
          <p className="text-xs font-bold uppercase text-muted-foreground mb-1.5">{t("quantity")}</p>
          <div className="inline-flex items-center gap-1 rounded-full border-[1.5px] border-border">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              aria-label={t("decreaseQuantity")}
              className="flex size-9 items-center justify-center rounded-full hover:bg-secondary disabled:opacity-30"
            >
              <Minus className="size-3.5" />
            </button>
            <span className="w-8 text-center text-sm font-bold" aria-live="polite">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(available, q + 1))}
              disabled={quantity >= available}
              aria-label={t("increaseQuantity")}
              className="flex size-9 items-center justify-center rounded-full hover:bg-secondary disabled:opacity-30"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-2 fixed inset-x-4 bottom-20 z-30 md:static md:inset-auto bg-card md:bg-transparent rounded-2xl md:rounded-none border md:border-0 border-border p-3 md:p-0 shadow-lg md:shadow-none">
        <div className="flex items-center gap-2.5">
          <WishlistButton
            product={product}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border-[1.5px] border-border bg-transparent text-foreground hover:bg-secondary transition-colors"
          />
          {available <= 0 ? (
            <Button variant="cta" className="flex-1" disabled>
              {t("unavailable")}
            </Button>
          ) : justAdded ? (
            <div className="flex flex-1 items-center gap-2">
              <Button type="button" variant="outline" className="flex-1 px-3 text-xs sm:text-sm" onClick={() => setJustAdded(false)}>
                {t("continueShopping")}
              </Button>
              <Button asChild variant="cta" className="flex-1 px-3 text-xs sm:text-sm">
                <Link href="/panier">{t("viewCart")}</Link>
              </Button>
            </div>
          ) : (
            <AddToCartButton
              productId={product.id}
              variantId={selectedVariant?.id}
              quantity={quantity}
              onAdded={() => setJustAdded(true)}
              className="flex-1 px-5 py-2.5 text-sm font-bold"
            >
              {t("addToCartPrice", { price: dh(price) })}
            </AddToCartButton>
          )}
        </div>

        {waHref && available > 0 && (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-full border-[1.5px] py-2.5 text-sm font-bold transition-colors"
            style={{ borderColor: "#25D366", color: "#128C4A" }}
          >
            <WhatsAppIcon className="size-[18px]" />
            {t("orderViaWhatsapp")}
          </a>
        )}
      </div>
      {/* La barre ci-dessus est en `fixed` sur mobile, donc retirée du flux :
          sans cet espaceur, le contenu suivant (bouton Partager, etc.)
          remonte dans son espace et se retrouve caché derrière elle. Un peu
          plus haute qu'avant (bouton WhatsApp en seconde ligne). */}
      <div className={cn("md:hidden", waHref && available > 0 ? "h-36" : "h-24")} aria-hidden />
    </div>
  );
}
