"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export function LandingGallery({ images, videoUrl, alt }: { images: string[]; videoUrl?: string; alt: string }) {
  const [active, setActive] = useState(0);
  const slides = videoUrl ? [videoUrl, ...images] : images;

  if (slides.length === 0) {
    return <div className="aspect-square bg-secondary flex items-center justify-center text-8xl">🧸</div>;
  }

  const activeSlide = slides[active];
  const isVideo = videoUrl && active === 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="relative aspect-square bg-secondary overflow-hidden">
        {isVideo ? (
          <video src={activeSlide} controls className="w-full h-full object-cover" />
        ) : (
          <Image src={activeSlide} alt={alt} fill sizes="100vw" className="object-cover" priority />
        )}
      </div>
      {slides.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] snap-x snap-mandatory">
          {slides.map((src, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={cn(
                "relative size-16 shrink-0 overflow-hidden rounded-lg border-2 snap-start",
                i === active ? "border-current" : "border-transparent opacity-70",
              )}
              style={i === active ? { borderColor: "var(--lp-primary)" } : undefined}
            >
              {videoUrl && i === 0 ? (
                <div className="flex size-full items-center justify-center bg-black/80 text-white text-xs">▶</div>
              ) : (
                <Image src={src} alt="" fill sizes="64px" className="object-cover" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
