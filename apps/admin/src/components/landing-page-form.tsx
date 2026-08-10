"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LANDING_TEMPLATES,
  LANDING_THEMES,
  defaultBlocksForTemplate,
  defaultThemeForTemplate,
  type LandingPageBlock,
  type LandingTemplate,
  type LandingTheme,
} from "@universenfants/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LandingPageBlocksEditor } from "@/components/landing-page-blocks-editor";
import { listAdminProducts, type AdminProduct } from "@/lib/products";
import {
  createLandingPage,
  updateLandingPage,
  type AdminLandingPage,
  type UpsertLandingPagePayload,
} from "@/lib/landing-pages";
import { ApiError } from "@/lib/api-client";

const TEMPLATE_LABELS: Record<LandingTemplate, string> = {
  "toy-premium": "Produit Jouet Premium",
  "flash-promo": "Promotion Flash",
  viral: "Produit Viral Réseaux Sociaux",
  "single-product": "Produit unique",
  seasonal: "Produit saisonnier",
  storytelling: "Storytelling",
  "facebook-ads": "Facebook Ads",
  "tiktok-ads": "TikTok Ads",
};
const THEME_LABELS: Record<LandingTheme, string> = {
  universenfants: "UniversEnfants",
  premium: "Premium",
  "promo-flash": "Promo Flash",
  minimalist: "Minimaliste",
};

function toDatetimeLocal(iso: string | null) {
  if (!iso) return "";
  return iso.slice(0, 16);
}

export function LandingPageForm({ page, initialProductId }: { page?: AdminLandingPage; initialProductId?: string }) {
  const router = useRouter();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [name, setName] = useState(page?.name ?? "");
  const [slug, setSlug] = useState(page?.slug ?? "");
  const [productId, setProductId] = useState(page?.productId ?? initialProductId ?? "");
  const [template, setTemplate] = useState<LandingTemplate>((page?.template as LandingTemplate) ?? "single-product");
  const [theme, setTheme] = useState<LandingTheme>((page?.theme as LandingTheme) ?? "universenfants");
  const [status, setStatus] = useState(page?.status ?? "DRAFT");
  const [blocks, setBlocks] = useState<LandingPageBlock[]>(page?.blocks ?? defaultBlocksForTemplate("single-product"));
  const [displayPrice, setDisplayPrice] = useState(page?.displayPrice ?? "");
  const [compareAtPrice, setCompareAtPrice] = useState(page?.compareAtPrice ?? "");
  const [ctaLabel, setCtaLabel] = useState(page?.ctaLabel ?? "Commander maintenant");
  const [primaryColor, setPrimaryColor] = useState(page?.primaryColor ?? "");
  const [ctaColor, setCtaColor] = useState(page?.ctaColor ?? "");
  const [countdownEnabled, setCountdownEnabled] = useState(page?.countdownEnabled ?? false);
  const [countdownStartAt, setCountdownStartAt] = useState(toDatetimeLocal(page?.countdownStartAt ?? null));
  const [countdownEndAt, setCountdownEndAt] = useState(toDatetimeLocal(page?.countdownEndAt ?? null));
  const [requireAddress, setRequireAddress] = useState(page?.requireAddress ?? false);
  const [successPhone, setSuccessPhone] = useState(page?.successPhone ?? "");
  const [successWhatsapp, setSuccessWhatsapp] = useState(page?.successWhatsapp ?? "");
  const [successHours, setSuccessHours] = useState(page?.successHours ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Sert de sélecteur (retrouver un produit par id pour préremplir le
    // formulaire) plutôt que d'une vraie liste paginée — une limite large
    // couvre le catalogue réel sans réclamer de pagination pour ce seul usage.
    listAdminProducts({ limit: 500 }).then((page) => setProducts(page.items));
  }, []);

  // Pré-remplissage ponctuel du formulaire dès que le produit visé (raccourci
  // "Créer une Landing Page" depuis une fiche produit) est disponible — pas
  // une synchronisation continue, garde `!name` pour ne s'exécuter qu'une fois.
  /* eslint-disable react-hooks/set-state-in-effect -- pré-remplissage ponctuel, voir commentaire ci-dessus */
  useEffect(() => {
    if (!page && initialProductId && products.length > 0 && !name) {
      const p = products.find((x) => x.id === initialProductId);
      if (p) {
        setName(p.nameFr);
        setSlug(`${p.seoUrl}-promo`);
        setDisplayPrice(p.promoPrice ?? p.price);
        setCompareAtPrice(p.promoPrice ? p.price : "");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function handleTemplateChange(next: LandingTemplate) {
    setTemplate(next);
    if (!page) {
      setBlocks(defaultBlocksForTemplate(next));
      setTheme(defaultThemeForTemplate(next));
    }
  }

  async function handleSubmit() {
    setError(null);
    setSaving(true);
    const payload: UpsertLandingPagePayload = {
      name,
      slug,
      productId,
      template,
      theme,
      blocks,
      displayPrice: displayPrice ? Number(displayPrice) : undefined,
      compareAtPrice: compareAtPrice ? Number(compareAtPrice) : undefined,
      primaryColor: primaryColor || undefined,
      ctaColor: ctaColor || undefined,
      ctaLabel: ctaLabel || undefined,
      countdownEnabled,
      countdownStartAt: countdownEnabled && countdownStartAt ? new Date(countdownStartAt).toISOString() : undefined,
      countdownEndAt: countdownEnabled && countdownEndAt ? new Date(countdownEndAt).toISOString() : undefined,
      requireAddress,
      successPhone: successPhone || undefined,
      successWhatsapp: successWhatsapp || undefined,
      successHours: successHours || undefined,
      status,
    };
    try {
      if (page) await updateLandingPage(page.id, payload);
      else await createLandingPage(payload);
      router.push("/landing-pages");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader><CardTitle>Informations générales</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3.5">
          <div className="flex flex-col gap-1.5">
            <Label>Nom de la campagne</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Trottinette Été 2026" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>URL (slug)</Label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="trottinette-ete" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Produit associé</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              <option value="">Choisir…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.nameFr}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Statut</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
            >
              <option value="DRAFT">Brouillon</option>
              <option value="ACTIVE">Active</option>
              <option value="ARCHIVED">Archivée</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Template</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={template}
              onChange={(e) => handleTemplateChange(e.target.value as LandingTemplate)}
            >
              {LANDING_TEMPLATES.map((t) => (
                <option key={t} value={t}>{TEMPLATE_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Thème visuel</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={theme}
              onChange={(e) => setTheme(e.target.value as LandingTheme)}
            >
              {LANDING_THEMES.map((t) => (
                <option key={t} value={t}>{THEME_LABELS[t]}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Prix & personnalisation</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3.5">
          <div className="flex flex-col gap-1.5">
            <Label>Prix affiché (DH) — laisser vide pour utiliser le prix produit</Label>
            <Input type="number" step="0.01" value={displayPrice} onChange={(e) => setDisplayPrice(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Prix barré (DH)</Label>
            <Input type="number" step="0.01" value={compareAtPrice} onChange={(e) => setCompareAtPrice(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Libellé du bouton principal</Label>
            <Input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Couleur principale (override thème)</Label>
            <Input type="color" value={primaryColor || "#6c5ce7"} onChange={(e) => setPrimaryColor(e.target.value)} className="h-9 w-20 p-1" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Couleur du bouton CTA (override thème)</Label>
            <Input type="color" value={ctaColor || "#ff6b81"} onChange={(e) => setCtaColor(e.target.value)} className="h-9 w-20 p-1" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Compte à rebours</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3.5">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={countdownEnabled} onChange={(e) => setCountdownEnabled(e.target.checked)} />
            Afficher un compte à rebours promotionnel
          </label>
          {countdownEnabled && (
            <div className="grid sm:grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1.5">
                <Label>Début</Label>
                <Input type="datetime-local" value={countdownStartAt} onChange={(e) => setCountdownStartAt(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Fin</Label>
                <Input type="datetime-local" value={countdownEndAt} onChange={(e) => setCountdownEndAt(e.target.value)} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Commande rapide</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3.5">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={requireAddress} onChange={(e) => setRequireAddress(e.target.checked)} />
            Demander l&apos;adresse (sinon : nom, téléphone, ville, quantité seulement)
          </label>
          <div className="grid sm:grid-cols-3 gap-3.5">
            <div className="flex flex-col gap-1.5">
              <Label>Téléphone (message de succès)</Label>
              <Input value={successPhone} onChange={(e) => setSuccessPhone(e.target.value)} placeholder="05 22 00 00 00" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>WhatsApp</Label>
              <Input value={successWhatsapp} onChange={(e) => setSuccessWhatsapp(e.target.value)} placeholder="06 00 00 00 00" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Horaires du service client</Label>
              <Input value={successHours} onChange={(e) => setSuccessHours(e.target.value)} placeholder="Lun-Sam, 9h-19h" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Contenu de la page (blocs)</CardTitle></CardHeader>
        <CardContent>
          <LandingPageBlocksEditor blocks={blocks} onChange={setBlocks} />
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2.5">
        <Button onClick={handleSubmit} disabled={saving || !name || !slug || !productId}>
          {saving ? "Enregistrement…" : page ? "Enregistrer" : "Créer la landing page"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/landing-pages")}>Annuler</Button>
      </div>
    </div>
  );
}
