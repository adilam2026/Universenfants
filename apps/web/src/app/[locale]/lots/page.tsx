"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { PackagePlus, Check, Loader2, PackageOpen } from "lucide-react";
import { getActiveBundles, type Bundle } from "@/lib/api";
import { addToCart } from "@/lib/cart-client";
import { broadcastCartUpdate } from "@/hooks/use-cart";
import { localized } from "@/lib/localized";
import { Button } from "@/components/ui/button";

function dh(value: number) {
  return `${value.toLocaleString("fr-FR")} DH`;
}

export default function BundlesPage() {
  const t = useTranslations("bundles");
  const locale = useLocale();
  const [bundles, setBundles] = useState<Bundle[] | null>(null);

  useEffect(() => {
    getActiveBundles().then(setBundles).catch(() => setBundles([]));
  }, []);

  if (!bundles) {
    return <div className="mx-auto max-w-4xl px-4 py-16 text-center text-muted-foreground">{t("loading")}</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 md:px-7 py-6">
      <h1 className="font-display text-2xl font-extrabold mb-1">{t("title")}</h1>
      <p className="text-sm text-muted-foreground mb-5">{t("subtitle")}</p>

      {bundles.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <PackageOpen className="mx-auto size-10 mb-3 opacity-40" />
          <p>{t("empty")}</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {bundles.map((bundle) => (
            <BundleCard key={bundle.id} bundle={bundle} locale={locale} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function BundleCard({ bundle, locale, t }: { bundle: Bundle; locale: string; t: ReturnType<typeof useTranslations> }) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");

  async function handleAddAll() {
    if (state === "loading") return;
    setState("loading");
    try {
      for (const item of bundle.items) {
        await addToCart(item.productId, item.quantity);
      }
      broadcastCartUpdate();
      setState("done");
      setTimeout(() => setState("idle"), 1500);
    } catch {
      setState("idle");
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <h2 className="font-bold text-base mb-3">{bundle.name}</h2>
      <div className="flex flex-col gap-2.5 mb-3.5">
        {bundle.items.map((item) => (
          <div key={item.productId} className="flex items-center gap-2.5">
            <div className="relative size-11 shrink-0 rounded-lg bg-brand-primary-soft overflow-hidden">
              {item.image && <Image src={item.image} alt="" fill sizes="44px" className="object-cover" />}
            </div>
            <div className="flex-1 min-w-0 text-sm">
              <p className="truncate">{localized(item.nameFr, item.nameAr, locale)} {item.quantity > 1 && `×${item.quantity}`}</p>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">{dh(item.unitPrice * item.quantity)}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-border">
        {/* Le panier facture chaque article à son prix individuel réel
            (bundle.individualTotal) : bundle.bundlePrice n'est qu'un prix
            cible affiché à l'admin, jamais appliqué au checkout — l'afficher
            ici comme prix client donnerait l'illusion d'une remise qui ne
            sera pas réellement accordée. */}
        <p className="font-display text-lg font-extrabold">{dh(bundle.individualTotal)}</p>
        <Button variant="cta" size="sm" onClick={handleAddAll} disabled={state === "loading"}>
          {state === "loading" ? <Loader2 className="size-4 animate-spin" /> : state === "done" ? <Check className="size-4" /> : <PackagePlus className="size-4" />}
          {t("addAll")}
        </Button>
      </div>
    </div>
  );
}
