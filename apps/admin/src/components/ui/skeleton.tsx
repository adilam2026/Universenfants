import { cn } from "@/lib/utils";

/** Bloc de contenu inconnu en cours de chargement — remplace les textes
 * « Chargement… » au centre d'écrans vides par une forme qui préfigure la
 * mise en page finale, pour éviter le saut de layout au moment où la vraie
 * donnée arrive. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("animate-pulse rounded-md bg-secondary", className)} {...props} />;
}

/** Lignes de tableau factices — mêmes proportions qu'une ligne réelle
 * (libellé large + 2-3 colonnes courtes) pour qu'aucun redimensionnement
 * visible n'ait lieu une fois les vraies lignes affichées. */
function TableSkeleton({ rows = 6, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3.5">
          <Skeleton className="h-4 flex-[2] max-w-56" />
          {Array.from({ length: columns - 1 }).map((__, j) => (
            <Skeleton key={j} className="h-4 flex-1 max-w-24" />
          ))}
        </div>
      ))}
    </div>
  );
}

function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="flex flex-col gap-2.5 p-5">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn("h-4", i === 0 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div className="flex items-center gap-3.5 p-5">
      <Skeleton className="size-10 rounded-md shrink-0" />
      <div className="flex flex-col gap-2 flex-1">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-5 w-16" />
      </div>
    </div>
  );
}

export { Skeleton, TableSkeleton, CardSkeleton, KpiSkeleton };
