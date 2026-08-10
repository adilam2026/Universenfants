/** Taille de page par défaut des listes paginées (produits, commandes,
 * clients) — partagée entre les pages elles-mêmes et le préchargement
 * d'arrière-plan pour que les deux calculent exactement la même clé SWR. Un
 * décalage ici referait un appel réseau évitable au premier clic sur la
 * rubrique. */
export const LIST_PAGE_SIZE = 50;
