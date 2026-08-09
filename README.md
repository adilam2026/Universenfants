# UniversEnfants

Plateforme e-commerce de jouets pour enfants (Maroc), bilingue FR/AR avec
support RTL complet. Monorepo pnpm/Turborepo.

## Stack

| Composant       | Techno                                             |
| --------------- | --------------------------------------------------- |
| Boutique        | Next.js 16 (App Router), TypeScript, Tailwind, next-intl |
| Back-Office      | Next.js 16, TypeScript, Tailwind                    |
| API              | NestJS, Prisma, PostgreSQL                          |
| Cache / files    | Redis                                                |
| Recherche        | Meilisearch (avec repli Postgres si indisponible)   |
| Stockage images  | Cloudflare R2 (S3-compatible), repli disque local en dev |
| Emails           | SMTP (nodemailer), journalisés sur disque en dev     |
| Erreurs          | Sentry (optionnel)                                   |

## Structure du monorepo

```
apps/
  api/     API NestJS (source de vérité unique — boutique et back-office ne parlent qu'à elle)
  web/     Boutique (storefront) — apps/web
  admin/   Back-Office (staff) — apps/admin
packages/
  shared/  Enums, constantes et types partagés entre apps/api, apps/web, apps/admin
```

## Démarrage rapide

Prérequis : Node ≥ 20, pnpm ≥ 10 (`corepack enable` suffit), Docker (recommandé
pour Postgres/Redis/Meilisearch — sinon installez-les vous-même).

```bash
./scripts/setup.sh   # installe les dépendances, prépare les .env, migre + seed la base
pnpm dev              # lance api (:4000), web (:3000) et admin (:3001) en parallèle
```

Compte back-office par défaut après le seed : `admin@universenfants.ma` /
`ChangeMe123!` — **à changer immédiatement en production**.

### Étapes manuelles (si vous préférez ne pas utiliser `scripts/setup.sh`)

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
cp apps/admin/.env.example apps/admin/.env.local
docker compose up -d                                   # Postgres, Redis, Meilisearch
pnpm --filter @universenfants/api prisma:generate
pnpm --filter @universenfants/api prisma:deploy
pnpm db:seed
pnpm dev
```

## Scripts courants

| Commande             | Effet                                                    |
| --------------------- | --------------------------------------------------------- |
| `pnpm dev`            | Lance les 3 apps en mode développement (Turborepo)         |
| `pnpm build`          | Build de production des 3 apps                            |
| `pnpm typecheck`      | Vérification TypeScript de tout le monorepo                |
| `pnpm lint`           | Lint de tout le monorepo                                   |
| `pnpm db:migrate`     | `prisma migrate dev` (développement, interactif)            |
| `pnpm db:seed`        | Rejoue le jeu de données de démonstration                  |
| `./scripts/generate-secrets.sh` | Génère des secrets JWT forts pour la production   |
| `./scripts/backup-db.sh`        | Sauvegarde la base Postgres (pg_dump)             |
| `./scripts/restore-db.sh`       | Restaure une sauvegarde (destructif, confirmation requise) |
| `./scripts/smoke-test.sh`       | Vérifie un déploiement (santé API, pages clés)    |

`.github/workflows/ci.yml` lance lint/typecheck sur chaque PR, plus un build
complet (API + boutique + Back-Office contre une base de données jetable)
pour détecter tout ce qui casserait un déploiement réel.

## Déploiement

- **Boutique et Back-Office** : deux projets Vercel distincts (voir
  `apps/web/vercel.json` et `apps/admin/vercel.json`), Root Directory =
  `apps/web` / `apps/admin` respectivement. Voir [DEPLOYMENT.md](./DEPLOYMENT.md)
  pour la liste complète des variables d'environnement à renseigner sur Vercel.
- **API** : NestJS + Prisma ne sont pas adaptés à l'exécution serverless de
  Vercel (connexions Postgres persistantes, tâches longues). Déployez-la sur
  une plateforme à process long-lived (Railway, Render, Fly.io, VPS) à l'aide
  de `apps/api/Dockerfile` — détails dans [DEPLOYMENT.md](./DEPLOYMENT.md).

## Variables d'environnement

Chaque app a son propre `.env.example` documenté :
`apps/api/.env.example`, `apps/web/.env.example`, `apps/admin/.env.example`.
Tous les services externes (Meilisearch, Cloudflare R2, SMTP, Sentry) sont en
dégradation gracieuse : s'ils ne sont pas configurés, l'application continue
de fonctionner avec un repli local (recherche Postgres, stockage disque,
emails journalisés sur disque, pas de remontée d'erreurs).

## Tests

Pas de suite de tests automatisés à ce jour — la validation s'est faite par
tests end-to-end manuels (Playwright) à chaque fonctionnalité. Voir
`pnpm test` (Turborepo) une fois des tests ajoutés.
