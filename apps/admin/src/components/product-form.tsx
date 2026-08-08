"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { listCategories, listBrands, type AdminCategory, type AdminBrand } from "@/lib/catalog";
import { createProduct, updateProduct, type AdminProduct, type UpsertProductPayload } from "@/lib/products";
import { ApiError } from "@/lib/api-client";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Select({ name, defaultValue, required, children }: { name: string; defaultValue?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      required={required}
      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </select>
  );
}

export function ProductForm({ product }: { product?: AdminProduct }) {
  const router = useRouter();
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [brands, setBrands] = useState<AdminBrand[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listCategories().then(setCategories);
    listBrands().then(setBrands);
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const num = (key: string) => {
      const v = form.get(key);
      return v && String(v).length > 0 ? Number(v) : undefined;
    };
    const payload: UpsertProductPayload = {
      sku: String(form.get("sku")),
      barcode: String(form.get("barcode") || "") || undefined,
      nameFr: String(form.get("nameFr")),
      nameAr: String(form.get("nameAr") || "") || undefined,
      shortDescFr: String(form.get("shortDescFr") || "") || undefined,
      longDescFr: String(form.get("longDescFr") || "") || undefined,
      categoryId: String(form.get("categoryId")),
      brandId: String(form.get("brandId") || "") || undefined,
      ageMin: num("ageMin"),
      ageMax: num("ageMax"),
      targetGender: String(form.get("targetGender")) as "BOY" | "GIRL" | "UNISEX",
      price: Number(form.get("price")),
      promoPrice: num("promoPrice"),
      costPrice: Number(form.get("costPrice")),
      stock: num("stock"),
      alertThreshold: num("alertThreshold"),
      seoUrl: String(form.get("seoUrl")),
      metaTitle: String(form.get("metaTitle") || "") || undefined,
      metaDescription: String(form.get("metaDescription") || "") || undefined,
      status: String(form.get("status")) as "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED",
    };

    try {
      if (product) {
        await updateProduct(product.id, payload);
      } else {
        await createProduct(payload);
      }
      router.push("/produits");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Card>
        <CardHeader><CardTitle>Informations générales</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <Field label="SKU *"><Input name="sku" defaultValue={product?.sku} required /></Field>
          <Field label="Code-barres"><Input name="barcode" defaultValue={product?.barcode ?? ""} /></Field>
          <Field label="Nom (FR) *"><Input name="nameFr" defaultValue={product?.nameFr} required /></Field>
          <Field label="Nom (AR)"><Input name="nameAr" dir="rtl" defaultValue={product?.nameAr ?? ""} /></Field>
          <div className="sm:col-span-2">
            <Field label="Description courte">
              <Input name="shortDescFr" defaultValue={product?.shortDescFr ?? ""} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Description longue">
              <textarea
                name="longDescFr"
                defaultValue={product?.longDescFr ?? ""}
                rows={4}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Classification</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <Field label="Catégorie *">
            {/* key forces a remount once categories finish loading, so defaultValue
                (uncontrolled) re-applies against the real option list instead of
                silently resolving to the empty placeholder. */}
            <Select key={categories.length} name="categoryId" defaultValue={product?.categoryId} required>
              <option value="">Choisir…</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.nameFr}</option>)}
            </Select>
          </Field>
          <Field label="Marque">
            <Select key={brands.length} name="brandId" defaultValue={product?.brandId ?? ""}>
              <option value="">Aucune</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </Field>
          <Field label="Âge min"><Input name="ageMin" type="number" min={0} defaultValue={product?.ageMin ?? ""} /></Field>
          <Field label="Âge max"><Input name="ageMax" type="number" min={0} defaultValue={product?.ageMax ?? ""} /></Field>
          <Field label="Genre ciblé">
            <Select name="targetGender" defaultValue={product?.targetGender ?? "UNISEX"}>
              <option value="UNISEX">Unisexe</option>
              <option value="BOY">Garçon</option>
              <option value="GIRL">Fille</option>
            </Select>
          </Field>
          <Field label="Statut">
            <Select name="status" defaultValue={product?.status ?? "DRAFT"}>
              <option value="DRAFT">Brouillon</option>
              <option value="ACTIVE">Actif</option>
              <option value="INACTIVE">Inactif</option>
              <option value="ARCHIVED">Archivé</option>
            </Select>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Prix &amp; stock</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <Field label="Prix de vente (DH) *"><Input name="price" type="number" step="0.01" min={0} defaultValue={product?.price} required /></Field>
          <Field label="Prix promo (DH)"><Input name="promoPrice" type="number" step="0.01" min={0} defaultValue={product?.promoPrice ?? ""} /></Field>
          <Field label="Prix de revient (DH) *"><Input name="costPrice" type="number" step="0.01" min={0} defaultValue={product?.costPrice} required /></Field>
          {!product && <Field label="Stock initial"><Input name="stock" type="number" min={0} defaultValue={0} /></Field>}
          <Field label="Seuil d'alerte stock"><Input name="alertThreshold" type="number" min={0} defaultValue={product?.alertThreshold ?? 5} /></Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>SEO</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <Field label="URL SEO (slug) *"><Input name="seoUrl" defaultValue={product?.seoUrl} required /></Field>
          <Field label="Meta titre"><Input name="metaTitle" defaultValue={product?.metaTitle ?? ""} /></Field>
          <div className="sm:col-span-2">
            <Field label="Meta description"><Input name="metaDescription" defaultValue={product?.metaDescription ?? ""} /></Field>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2.5">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Enregistrement…" : product ? "Enregistrer les modifications" : "Créer le produit"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/produits")}>Annuler</Button>
      </div>
    </form>
  );
}
