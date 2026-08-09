export function InlineCta({ label }: { label: string }) {
  return (
    <div className="px-5 py-2 max-w-md mx-auto">
      <a
        href="#commande"
        className="block w-full rounded-full py-3 text-center text-white font-extrabold text-sm"
        style={{ background: "var(--lp-cta)" }}
      >
        {label}
      </a>
    </div>
  );
}
