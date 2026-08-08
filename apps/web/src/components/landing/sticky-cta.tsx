"use client";

export function StickyCta({ label }: { label: string }) {
  return (
    <div className="fixed bottom-0 inset-x-0 z-40 p-3 bg-white/95 backdrop-blur border-t border-border md:hidden">
      <a
        href="#commande"
        className="block w-full rounded-full py-3.5 text-center text-white font-extrabold"
        style={{ background: "var(--lp-cta, #ff6b81)" }}
      >
        {label}
      </a>
    </div>
  );
}
