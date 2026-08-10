"use client";

import { use } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Rocket } from "lucide-react";
import { ProductForm } from "@/components/product-form";
import { StockAdjustCard } from "@/components/stock-adjust-card";
import { ProductImagesCard } from "@/components/product-images-card";
import { ProductVariantsCard } from "@/components/product-variants-card";
import { ProductUpsellsCard } from "@/components/product-upsells-card";
import { Button } from "@/components/ui/button";
import { CardSkeleton } from "@/components/ui/skeleton";
import { getAdminProduct, listProductUpsells, type AdminProduct, type UpsellEntry } from "@/lib/products";

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  // `mutate` local (par clé) plutôt qu'un state React séparé : les cartes
  // enfants (images, variantes, stock) calculent déjà l'objet produit à jour
  // et le poussent ici — l'écrire dans le cache SWR (sans revalidation)
  // maintient l'affichage ET une future revisite de cette fiche synchrones,
  // sans appel réseau supplémentaire.
  const { data: product, error: productError, mutate: setProduct } = useSWR<AdminProduct>(`/products/admin/${id}`, () => getAdminProduct(id));
  const { data: upsells = [], mutate: setUpsells } = useSWR<UpsellEntry[]>(`/products/${id}/upsells`, () => listProductUpsells(id));

  if (productError) return <p className="text-sm text-destructive">{productError instanceof Error ? productError.message : "Produit introuvable"}</p>;
  if (!product) return <CardSkeleton lines={6} />;

  return (
    <div>
      <h1 className="text-xl font-bold mb-5">{product.nameFr}</h1>
      <div className="grid lg:grid-cols-[1fr_280px] gap-5 items-start">
        <div className="flex flex-col gap-5">
          <ProductImagesCard
            productId={product.id}
            images={product.images}
            onChanged={(images) => setProduct((prev) => (prev ? { ...prev, images } : prev), { revalidate: false })}
          />
          <ProductForm product={product} />
          <ProductVariantsCard
            productId={product.id}
            variants={product.variants}
            onChanged={(variants) => setProduct((prev) => (prev ? { ...prev, variants } : prev), { revalidate: false })}
          />
          <ProductUpsellsCard productId={product.id} upsells={upsells} onChanged={(next) => setUpsells(next, { revalidate: false })} />
        </div>
        <div className="flex flex-col gap-5">
          <Button asChild variant="outline" className="w-full">
            <Link href={`/landing-pages/nouveau?productId=${product.id}`}>
              <Rocket className="size-4" /> Créer une Landing Page
            </Link>
          </Button>
          <StockAdjustCard
            product={product}
            onAdjusted={(newStock) => setProduct((prev) => (prev ? { ...prev, stock: newStock } : prev), { revalidate: false })}
          />
        </div>
      </div>
    </div>
  );
}
