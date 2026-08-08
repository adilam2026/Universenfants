"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Rocket } from "lucide-react";
import { ProductForm } from "@/components/product-form";
import { StockAdjustCard } from "@/components/stock-adjust-card";
import { ProductImagesCard } from "@/components/product-images-card";
import { Button } from "@/components/ui/button";
import { getAdminProduct, type AdminProduct } from "@/lib/products";

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAdminProduct(id)
      .then(setProduct)
      .catch((e) => setError(e instanceof Error ? e.message : "Produit introuvable"));
  }, [id]);

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!product) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  return (
    <div>
      <h1 className="text-xl font-bold mb-5">{product.nameFr}</h1>
      <div className="grid lg:grid-cols-[1fr_280px] gap-5 items-start">
        <div className="flex flex-col gap-5">
          <ProductImagesCard
            productId={product.id}
            images={product.images}
            onChanged={(images) => setProduct((prev) => (prev ? { ...prev, images } : prev))}
          />
          <ProductForm product={product} />
        </div>
        <div className="flex flex-col gap-5">
          <Button asChild variant="outline" className="w-full">
            <Link href={`/landing-pages/nouveau?productId=${product.id}`}>
              <Rocket className="size-4" /> Créer une Landing Page
            </Link>
          </Button>
          <StockAdjustCard
            product={product}
            onAdjusted={(newStock) => setProduct((prev) => (prev ? { ...prev, stock: newStock } : prev))}
          />
        </div>
      </div>
    </div>
  );
}
