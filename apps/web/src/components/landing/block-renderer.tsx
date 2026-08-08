import Image from "next/image";
import { Star, Check, ShieldCheck } from "lucide-react";
import type { LandingPageBlock } from "@universenfants/shared";

export function BlockRenderer({ block }: { block: LandingPageBlock }) {
  switch (block.type) {
    case "hero":
      return (
        <section className="px-5 py-8 text-center" style={{ background: "var(--lp-primary, #6c5ce7)", color: "white" }}>
          {block.bannerUrl && (
            <div className="relative w-full max-w-md mx-auto aspect-video rounded-2xl overflow-hidden mb-5">
              <Image src={block.bannerUrl} alt="" fill className="object-cover" priority />
            </div>
          )}
          {block.videoUrl && (
            <video src={block.videoUrl} controls className="w-full max-w-md mx-auto rounded-2xl mb-5" />
          )}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-balance">{block.title}</h1>
          {block.subtitle && <p className="mt-2 text-white/90 max-w-md mx-auto">{block.subtitle}</p>}
        </section>
      );

    case "gallery":
      return (
        <section className="px-5 py-6">
          <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
            {block.images.map((src, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-secondary">
                <Image src={src} alt="" fill className="object-cover" />
              </div>
            ))}
          </div>
        </section>
      );

    case "description":
      return (
        <section className="px-5 py-6 max-w-md mx-auto">
          <p className="text-sm leading-relaxed whitespace-pre-line">{block.text}</p>
        </section>
      );

    case "advantages":
      return (
        <section className="px-5 py-6 max-w-md mx-auto">
          <ul className="flex flex-col gap-2.5">
            {block.items.map((item, i) => (
              <li key={i} className="flex items-center gap-2.5 text-sm font-medium">
                <Check className="size-5 shrink-0" style={{ color: "var(--lp-primary, #6c5ce7)" }} />
                {item}
              </li>
            ))}
          </ul>
        </section>
      );

    case "trust":
      return (
        <section className="px-5 py-6 max-w-md mx-auto grid grid-cols-2 gap-3">
          {block.items.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-xs font-bold rounded-xl bg-secondary p-3">
              <ShieldCheck className="size-4 shrink-0" style={{ color: "var(--lp-primary, #6c5ce7)" }} />
              {item}
            </div>
          ))}
        </section>
      );

    case "testimonials":
      return (
        <section className="px-5 py-6 max-w-md mx-auto">
          <h2 className="text-lg font-extrabold mb-3.5 text-center">Ce qu&apos;en disent nos clients</h2>
          <div className="flex flex-col gap-3">
            {block.items.map((item, i) => (
              <div key={i} className="rounded-xl border border-border bg-white p-3.5">
                <div className="flex items-center gap-0.5 text-brand-highlight mb-1">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className="size-3.5" fill={j < item.rating ? "currentColor" : "none"} />
                  ))}
                </div>
                <p className="text-sm">{item.comment}</p>
                <p className="text-xs font-bold text-muted-foreground mt-1">{item.name}</p>
              </div>
            ))}
          </div>
        </section>
      );

    case "faq":
      return (
        <section className="px-5 py-6 max-w-md mx-auto">
          <h2 className="text-lg font-extrabold mb-3.5 text-center">Questions fréquentes</h2>
          <div className="flex flex-col gap-2.5">
            {block.items.map((item, i) => (
              <details key={i} className="rounded-xl border border-border bg-white p-3.5">
                <summary className="text-sm font-bold cursor-pointer">{item.question}</summary>
                <p className="text-sm text-muted-foreground mt-2">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      );
  }
}
