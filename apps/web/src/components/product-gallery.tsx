"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { ProductImage } from "@/lib/api";

export function ProductGallery({ images, alt }: { images: ProductImage[]; alt: string }) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="aspect-square rounded-3xl bg-brand-primary-soft flex items-center justify-center text-8xl">🧸</div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="relative aspect-square rounded-3xl overflow-hidden bg-brand-primary-soft">
        <Image src={images[active].url} alt={alt} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" priority />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setActive(i)}
              className={cn(
                "relative size-16 shrink-0 rounded-xl overflow-hidden border-2",
                i === active ? "border-primary" : "border-transparent",
              )}
            >
              <Image src={img.thumbnailUrl ?? img.url} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
