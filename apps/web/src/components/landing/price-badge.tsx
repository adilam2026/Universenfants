function dh(value: number) {
  return `${value.toLocaleString("fr-FR")} DH`;
}

export function PriceBadge({ price, compareAt }: { price: number; compareAt: number | null }) {
  const hasPromo = compareAt !== null && compareAt > price;
  const savings = hasPromo ? compareAt - price : 0;
  const percent = hasPromo ? Math.round((1 - price / compareAt) * 100) : 0;

  return (
    <div className="flex flex-col items-center gap-1.5 py-2">
      <div className="flex items-baseline gap-3">
        {hasPromo && <span className="text-xl text-muted-foreground line-through">{dh(compareAt)}</span>}
        <span className="text-4xl font-extrabold" style={{ color: "var(--lp-primary)" }}>{dh(price)}</span>
      </div>
      {hasPromo && (
        <div className="flex items-center gap-2">
          <span className="rounded-full px-3 py-1 text-xs font-extrabold text-white" style={{ background: "var(--lp-cta)" }}>
            -{percent}%
          </span>
          <span className="text-sm font-bold" style={{ color: "var(--lp-primary)" }}>
            Économisez {dh(savings)}
          </span>
        </div>
      )}
    </div>
  );
}
