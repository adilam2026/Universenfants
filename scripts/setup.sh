#!/usr/bin/env bash
# Bootstrap d'un environnement de développement local pour UniversEnfants.
# Usage : ./scripts/setup.sh
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Vérification des prérequis"
command -v pnpm >/dev/null || { echo "pnpm est requis (https://pnpm.io/installation)"; exit 1; }
command -v docker >/dev/null || echo "⚠ docker introuvable — vous devrez démarrer Postgres/Redis/Meilisearch vous-même."

echo "==> Installation des dépendances (pnpm workspace)"
pnpm install

for app in apps/api apps/web apps/admin; do
  if [ ! -f "$app/.env" ] && [ -f "$app/.env.example" ]; then
    cp "$app/.env.example" "$app/.env"
    echo "==> $app/.env créé depuis .env.example (à adapter si besoin)"
  fi
  if [ ! -f "$app/.env.local" ] && [ -f "$app/.env.example" ] && [ "$app" != "apps/api" ]; then
    cp "$app/.env.example" "$app/.env.local"
    echo "==> $app/.env.local créé depuis .env.example (à adapter si besoin)"
  fi
done

if command -v docker >/dev/null; then
  echo "==> Démarrage de Postgres / Redis / Meilisearch (docker compose)"
  docker compose up -d
  echo "==> Attente de la disponibilité de Postgres"
  until docker compose exec -T postgres pg_isready -U universenfants >/dev/null 2>&1; do sleep 1; done
fi

echo "==> Application des migrations Prisma"
pnpm --filter @universenfants/api prisma:generate
pnpm --filter @universenfants/api prisma:deploy

echo "==> Jeu de données de démonstration (catégories, produits, compte admin)"
pnpm db:seed

cat <<'EOF'

✅ Environnement prêt. Pour démarrer :

  pnpm dev

  - Boutique  : http://localhost:3000
  - Back-Office : http://localhost:3001
  - API       : http://localhost:4000/api (docs : /api/docs)

Identifiants admin par défaut : voir apps/api/prisma/seed.ts
EOF
