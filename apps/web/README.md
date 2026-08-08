# apps/web — Boutique UniversEnfants

Next.js (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui (configuré
manuellement, `ui.shadcn.com` n'étant pas joignable depuis cet environnement
de build — voir `components.json` pour la configuration standard).

## Démarrer en local

```bash
pnpm --filter @universenfants/api dev   # API sur :4000
pnpm --filter @universenfants/web dev   # Boutique sur :3000
```

Nécessite `apps/api/.env` configuré (voir `.env.example`) et PostgreSQL +
Redis démarrés, avec le schéma migré et seedé :

```bash
pnpm --filter @universenfants/api prisma:migrate
pnpm --filter @universenfants/api prisma:seed
```
