# Procédures d'exploitation

Ce document couvre les opérations courantes une fois la plateforme en
production. Pour la mise en place initiale, voir [DEPLOYMENT.md](./DEPLOYMENT.md).

## Sauvegarde et restauration de la base de données

```bash
# Sauvegarde (à planifier régulièrement — voir "Sauvegardes automatiques" ci-dessous)
DATABASE_URL="postgresql://..." ./scripts/backup-db.sh [dossier_sortie]

# Restauration (DESTRUCTIF — écrase la base cible, demande confirmation)
DATABASE_URL="postgresql://..." ./scripts/restore-db.sh chemin/vers/fichier.dump
```

### Sauvegardes automatiques

Si votre hébergeur Postgres managé (Neon, Supabase, Railway...) propose des
sauvegardes automatiques gérées, préférez-les — elles gèrent la rétention et
la cohérence à chaud mieux qu'un script cron maison. `scripts/backup-db.sh`
sert surtout pour :
- une sauvegarde ponctuelle avant une migration risquée ou une opération
  manuelle sur les données ;
- un export local à des fins d'audit ou de récupération hors plateforme.

**Testez la restauration au moins une fois** avant d'en dépendre en
production — une sauvegarde jamais restaurée n'est qu'une hypothèse.

## Rotation des secrets JWT

```bash
./scripts/generate-secrets.sh
```

Changer `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` invalide immédiatement
tous les tokens émis avec l'ancienne valeur — **tous les utilisateurs
(clients et staff) sont déconnectés**. À ne faire qu'en cas de compromission
suspectée, ou en pratique de rotation planifiée avec communication préalable.

Après régénération : mettre à jour la variable d'environnement sur
l'hébergeur de l'API et redéployer.

## Vérification post-déploiement

```bash
./scripts/smoke-test.sh https://api.example.com https://boutique.example.com https://admin.example.com
```

Automatise la partie vérifiable de la checklist de [DEPLOYMENT.md](./DEPLOYMENT.md#checklist-post-déploiement)
(santé API, Swagger désactivé, catalogue et recherche accessibles, boutique
et Back-Office joignables). Sortie non-zéro si un point échoue — à intégrer
dans un pipeline de déploiement pour bloquer une mise en prod cassée.

Les étapes qui restent manuelles (changement du mot de passe admin, commande
test de bout en bout, vérification d'un upload d'image) le sont
délibérément : elles nécessitent un jugement humain ou touchent des données
réelles (créer une vraie commande test, par exemple) qu'on ne veut pas
automatiser sans discernement.

## Commande bloquée / litige client

Toute la logique métier (annulation, statuts, remboursement de points de
fidélité, libération de stock) passe par le Back-Office
(`/commandes/:id`) — pas d'intervention en base de données directe pour les
opérations courantes. Les statuts de commande suivent un flux strict
(`PENDING → CONFIRMED → PREPARING → SHIPPED → DELIVERED`, `CANCELLED`
possible avant expédition uniquement) appliqué côté API
(`ORDER_NEXT_STATUS` dans `packages/shared/src/enums.ts`) — le Back-Office
n'affiche que les transitions valides à chaque étape.

## CI

`.github/workflows/ci.yml` tourne sur chaque push/PR :
- `checks` : install, lint, typecheck sur tout le monorepo.
- `build` : migre + seed une base Postgres jetable, démarre l'API, puis
  construit la boutique et le Back-Office contre cette instance vivante
  (nécessaire car `next build` appelle l'API pour générer les pages
  statiques — un build contre une API éteinte échoue).

## Diagnostic rapide

| Symptôme | Piste |
| --- | --- |
| `/api/health` répond `"database":"down"` | Vérifier la connectivité/quota de l'hébergeur Postgres managé |
| `/api/health` répond `"redis":"down"` | Le login staff (verrou anti-bruteforce) et le rate-limiting en dépendent — vérifier l'hébergeur Redis |
| Recherche boutique lente ou vide | Meilisearch indisponible → repli automatique sur un filtre Postgres (fonctionnel mais moins pertinent) — vérifier les logs API pour `[SearchService]` |
| Emails de commande non reçus | `SMTP_HOST` absent ou mal configuré → emails journalisés sur disque au lieu d'être envoyés (voir logs API au démarrage) |
| Images produit invisibles après upload | R2 non configuré en production → repli disque local, non partagé entre déploiements — configurer `R2_*` |
| Nouveau code déployé mais comportement inchangé | Vérifier que `prisma migrate deploy` a bien tourné (voir `apps/api/Dockerfile`, exécuté au démarrage du conteneur) |
