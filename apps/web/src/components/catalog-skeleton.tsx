/** Squelette affiché pendant la navigation vers une page catalogue
 * (Server Component) — via `loading.tsx`, Next.js l'affiche immédiatement
 * au clic sur un filtre/tri/catégorie, le temps que le nouveau rendu
 * serveur arrive, plutôt que de laisser l'écran figé sans aucun retour
 * visuel jusqu'à l'arrivée de la réponse. Reprend exactement la mise en
 * page réelle (barre latérale + grille) pour qu'aucun saut de layout ne
 * soit visible à la bascule vers le contenu final. */
export function CatalogSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 md:px-7 py-4 animate-pulse">
      <div className="h-3 w-40 rounded bg-secondary mb-3" />
      <div className="h-7 w-56 rounded bg-secondary mb-5" />
      <div className="flex gap-7">
        <aside className="hidden md:block w-56 shrink-0 space-y-5">
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-4 w-32 rounded bg-secondary" />
            ))}
          </div>
        </aside>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3.5">
            <div className="h-4 w-24 rounded bg-secondary" />
            <div className="h-8 w-32 rounded-full bg-secondary" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border overflow-hidden">
                <div className="aspect-square bg-secondary" />
                <div className="p-2.5 space-y-1.5">
                  <div className="h-3 w-full rounded bg-secondary" />
                  <div className="h-3 w-2/3 rounded bg-secondary" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
