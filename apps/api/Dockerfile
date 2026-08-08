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
COPY --from=build /repo/node_modules node_modules
COPY --from=build /repo/package.json ./
COPY --from=build /repo/packages/shared/dist packages/shared/dist
COPY --from=build /repo/packages/shared/package.json packages/shared/package.json
COPY --from=build /repo/apps/api/dist apps/api/dist
COPY --from=build /repo/apps/api/prisma apps/api/prisma
COPY --from=build /repo/apps/api/package.json apps/api/package.json
COPY --from=build /repo/apps/api/node_modules apps/api/node_modules

WORKDIR /repo/apps/api
EXPOSE 4000
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/main.js"]
