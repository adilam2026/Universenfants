# Image de production pour l'API (NestJS). Se construit depuis la racine du
# monorepo : docker build -f apps/api/Dockerfile -t universenfants-api .
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @universenfants/shared build \
 && pnpm --filter @universenfants/api prisma:generate \
 && pnpm --filter @universenfants/api build

# node_modules est copié tel quel depuis le stage de build (plutôt que
# réinstallé) : le client Prisma généré vit dans un chemin versionné sous
# node_modules/.pnpm/, et sharp a des bindings natifs compilés pour cette
# image — les regénérer dans un second `pnpm install` est fragile.
FROM base AS runtime
ENV NODE_ENV=production
# L'image officielle node:*-alpine fournit déjà un utilisateur non-root
# "node" (UID 1000) — l'utiliser plutôt que de tourner en root, qui est le
# comportement par défaut d'un conteneur Docker sans directive USER.
COPY --from=build --chown=node:node /repo/node_modules node_modules
COPY --from=build --chown=node:node /repo/package.json ./
COPY --from=build --chown=node:node /repo/packages/shared/dist packages/shared/dist
COPY --from=build --chown=node:node /repo/packages/shared/package.json packages/shared/package.json
COPY --from=build --chown=node:node /repo/apps/api/dist apps/api/dist
COPY --from=build --chown=node:node /repo/apps/api/prisma apps/api/prisma
COPY --from=build --chown=node:node /repo/apps/api/package.json apps/api/package.json
COPY --from=build --chown=node:node /repo/apps/api/node_modules apps/api/node_modules

WORKDIR /repo/apps/api
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:'+(process.env.PORT||4000)+'/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
# UE_RUN_SEED=true (variable d'environnement, à retirer une fois le seed
# confirmé) : exécute le seed avant de démarrer l'API — mécanisme temporaire
# pour peupler une base déjà en production sans accès direct à la base
# (prisma/seed.ts est idempotent, upsert par upsert : le rejouer sur une base
# partiellement peuplée est sans danger). L'echo inconditionnel après
# ts-node est ce qui rend le bloc `if` non-bloquant : même si le seed
# plante, c'est cette dernière commande (toujours à 0) qui fixe le code de
# sortie du bloc, donc l'API démarre quand même — vérifié localement en
# forçant un DATABASE_URL invalide.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && (if [ \"$UE_RUN_SEED\" = \"true\" ]; then echo '=== UE_RUN_SEED=true: running prisma seed ===' && node_modules/.bin/ts-node prisma/seed.ts; echo '=== seed step finished (see exit above, non-fatal) ==='; fi) && node dist/main.js"]
