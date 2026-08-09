import Image from "next/image";
import { Star, Check, ShieldCheck } from "lucide-react";
import type { DescriptionBlock, AdvantagesBlock, TestimonialsBlock, FaqBlock, TrustBlock } from "@universenfants/shared";

export type BodyBlock = DescriptionBlock | AdvantagesBlock | TestimonialsBlock | FaqBlock | TrustBlock;

function initials(name: string) {
  return name.trim().slice(0, 2).toUpperCase();
}

export function BlockRenderer({ block }: { block: BodyBlock }) {
  switch (block.type) {
    case "description":
      return (
        <section className="px-5 py-6 max-w-md mx-auto">
          <p className="text-sm leading-relaxed whitespace-pre-line">{block.text}</p>
        </section>
      );

    case "advantages":
      return (
        <section className="px-5 py-6 max-w-md mx-auto">
          <div className="grid sm:grid-cols-2 gap-3">
            {block.items.map((item, i) => (
              <div key={i} className="flex items-center gap-2.5 rounded-xl p-3" style={{ background: "var(--lp-soft, #f5f5f5)" }}>
                <span
                  className="flex size-7 shrink-0 items-center justify-center rounded-full text-white"
                  style={{ background: "var(--lp-primary)" }}
                >
                  <Check className="size-4" />
                </span>
                <span className="text-sm font-bold">{item}</span>
              </div>
            ))}
          </div>
        </section>
      );

    case "trust":
      return (
        <section className="px-5 py-6 max-w-md mx-auto grid grid-cols-2 gap-3">
          {block.items.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-xs font-bold rounded-xl border border-border p-3">
              <ShieldCheck className="size-4 shrink-0" style={{ color: "var(--lp-primary)" }} />
              {item}
            </div>
          ))}
        </section>
      );

    case "testimonials":
      if (block.items.length === 0) return null;
      return (
        <section className="px-5 py-6 max-w-md mx-auto">
          <h2 className="text-lg font-extrabold mb-3.5 text-center">Ce qu&apos;en disent nos clients</h2>
          <div className="flex flex-col gap-3">
            {block.items.map((item, i) => (
              <div key={i} className="rounded-2xl border border-border bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2.5 mb-2">
                  {item.photoUrl ? (
                    <div className="relative size-9 shrink-0 rounded-full overflow-hidden">
                      <Image src={item.photoUrl} alt="" fill className="object-cover" />
                    </div>
                  ) : (
                    <div
                      className="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-extrabold text-white"
                      style={{ background: "var(--lp-primary)" }}
                    >
                      {initials(item.name)}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-bold">{item.name}</p>
                    <div className="flex items-center gap-0.5 text-brand-highlight">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star key={j} className="size-3" fill={j < item.rating ? "currentColor" : "none"} />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-foreground/90">&ldquo;{item.comment}&rdquo;</p>
              </div>
            ))}
          </div>
        </section>
      );

    case "faq":
      if (block.items.length === 0) return null;
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
