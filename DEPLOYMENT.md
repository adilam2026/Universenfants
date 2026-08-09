# Guide de déploiement

## Vue d'ensemble

Trois services à déployer séparément :

1. **API** (`apps/api`) — NestJS, doit tourner en process long-lived (pas
   compatible avec les fonctions serverless de Vercel : connexions Postgres
   persistantes, WebSockets potentiels, tâches de fond). À déployer sur
   Railway, Render, Fly.io ou un VPS via `apps/api/Dockerfile`.
2. **Boutique** (`apps/web`) — Vercel.
3. **Back-Office** (`apps/admin`) — Vercel (projet séparé, jamais indexé —
   voir `X-Robots-Tag` dans `apps/admin/next.config.ts`).

Plus les services managés/self-hébergés dont l'API dépend : PostgreSQL,
Redis, Meilisearch, Cloudflare R2 (stockage images), un fournisseur SMTP,
et optionnellement Sentry.

## 1. API

### Build

```bash
docker build -f apps/api/Dockerfile -t universenfants-api .
docker run -p 4000:4000 --env-file apps/api/.env universenfants-api
```

L'image applique les migrations Prisma (`prisma migrate deploy`) au
démarrage puis lance `node dist/main.js`.

### Premier déploiement uniquement : amorçage de la base

Les migrations créent les tables mais ne les remplissent pas. Sans cette
étape, la base de production est vide : aucun rôle/permission, aucun compte
super-admin (impossible de se connecter au Back-Office), aucune ville
(frais de livraison vides), aucune catégorie/marque de départ. À exécuter
**une seule fois**, juste après le tout premier déploiement (script idempotent,
sans risque de doublons à une exécution ultérieure) :

```bash
DATABASE_URL="<url de la base de production>" pnpm --filter @universenfants/api prisma:seed
```

Crée entre autres le compte `admin@universenfants.ma` / `ChangeMe123!` —
**changer immédiatement ce mot de passe** après la première connexion (voir
checklist post-déploiement plus bas).

### Variables d'environnement requises en production

Voir `apps/api/.env.example` pour la liste complète et les commentaires.
Points d'attention :

- `NODE_ENV=production` — active la validation stricte au démarrage
  (`src/common/env.check.ts` refuse de démarrer si `JWT_ACCESS_SECRET` /
  `JWT_REFRESH_SECRET` sont encore les valeurs de développement).
- `CORS_ORIGINS` — doit lister les URL exactes de la boutique et du
  back-office déployés (`https://boutique.example.com,https://admin.example.com`).
- `DATABASE_URL`, `REDIS_URL` — instances managées (ex. Neon/Supabase pour
  Postgres, Upstash pour Redis) ou auto-hébergées.
- `MEILISEARCH_HOST` / `MEILISEARCH_API_KEY` — Meilisearch Cloud ou instance
  self-hébergée (image Docker officielle, voir `docker-compose.yml` pour la
  config de référence). Si absent, l'API bascule automatiquement sur une
  recherche Postgres `contains` — la boutique reste fonctionnelle mais avec
  une pertinence dégradée.
- `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
  `R2_PUBLIC_URL` — bucket Cloudflare R2 pour les images produit. Si absent,
  les images sont stockées sur le disque local du container, ce qui **ne
  survit pas aux redéploiements** — à ne jamais laisser vide en production.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM_*` —
  fournisseur SMTP (ex. Resend, SendGrid, Mailgun, Brevo). Si absent, les
  emails transactionnels sont seulement journalisés sur disque — aucun
  email n'est réellement envoyé aux clients.
- `SENTRY_DSN` — optionnel mais recommandé en production pour le suivi
  d'erreurs (`src/instrument.ts`).
- `API_PUBLIC_URL`, `WEB_PUBLIC_URL` — utilisés respectivement pour générer
  les URL d'images uploadées (repli local) et les liens dans les emails
  (ex. réinitialisation de mot de passe).

## 2. Boutique (apps/web) sur Vercel

1. Nouveau projet Vercel → import du repo → **Root Directory : `apps/web`**.
2. Vercel détecte `apps/web/vercel.json` (build/install scopés via Turborepo,
   `ignoreCommand` via `turbo-ignore` pour ne rebuilder que si `apps/web` ou
   ses dépendances internes ont changé).
3. Variables d'environnement (Project Settings → Environment Variables) :
   - `NEXT_PUBLIC_API_URL` — URL publique de l'API déployée (ex.
     `https://api.universenfants.ma/api`).
   - `NEXT_PUBLIC_SITE_URL` — URL de la boutique elle-même (pour le sitemap).
   - `R2_PUBLIC_URL` — **même valeur que côté API** : `next.config.ts` en a
     besoin au build pour autoriser `next/image` à charger les images
     stockées sur R2 (`images.remotePatterns`).
   - `NEXT_PUBLIC_SENTRY_DSN` — optionnel.
4. Déployer. Vérifier `/robots.txt` et `/sitemap.xml` après le premier déploi.

## 3. Back-Office (apps/admin) sur Vercel

Même procédure avec **Root Directory : `apps/admin`**, variables
`NEXT_PUBLIC_API_URL` et `NEXT_PUBLIC_SENTRY_DSN`. Le Back-Office envoie déjà
`X-Robots-Tag: noindex, nofollow` — aucune configuration Vercel
supplémentaire n'est nécessaire pour l'exclure des moteurs de recherche.

## Checklist post-déploiement

- [ ] `curl https://api.example.com/api/health` répond `{"status":"ok", "database":"up", "redis":"up"}`
- [ ] Connexion Back-Office avec le compte admin, puis **changer le mot de passe par défaut**
- [ ] Passer une commande test de bout en bout (paiement à la livraison) et vérifier l'email de confirmation reçu
- [ ] Upload d'une image produit et vérifier qu'elle s'affiche bien depuis R2 (pas de repli disque local en production)
- [ ] Recherche boutique : vérifier que Meilisearch répond (sinon repli Postgres actif — vérifier les logs API)
- [ ] `/api/docs` (Swagger) doit renvoyer 404 en production (désactivé volontairement, voir `src/main.ts`)

La partie vérifiable de cette checklist est automatisée :
`./scripts/smoke-test.sh <api_url> <web_url> <admin_url>`.

## Après le déploiement

Voir [OPERATIONS.md](./OPERATIONS.md) pour les procédures courantes une fois
en production : sauvegarde/restauration de la base, rotation des secrets
JWT, diagnostic rapide.
