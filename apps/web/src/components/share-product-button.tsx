"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/** Web Share API sur mobile (partage natif vers WhatsApp/SMS/etc.), repli sur
 * la copie presse-papiers ailleurs — le bouton "Partager" de la fiche produit
 * n'avait jusqu'ici aucun onClick, contrairement aux autres boutons Partager
 * du site (panier, favoris) qui suivent déjà ce même repli. */
export function ShareProductButton({ title }: { title: string }) {
  const t = useTranslations("product");
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // Annulation par l'utilisateur — pas une erreur à afficher.
      }
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button variant="ghost" size="sm" className="mt-2.5" onClick={handleShare}>
      <Share2 className="size-4" /> {copied ? t("shareCopied") : t("share")}
    </Button>
  );
}
