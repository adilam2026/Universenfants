#!/usr/bin/env bash
# Génère des secrets aléatoires forts pour la configuration de production
# (JWT_ACCESS_SECRET, JWT_REFRESH_SECRET) — jamais les valeurs de
# développement de apps/api/.env.example, qui font échouer le démarrage en
# production (voir assertRequiredEnv() dans apps/api/src/common/env.check.ts).
#
# Usage : ./scripts/generate-secrets.sh
set -euo pipefail

command -v openssl >/dev/null || { echo "openssl est requis" >&2; exit 1; }

echo "# Copiez ces valeurs dans la configuration d'environnement de production de l'API"
echo "# (variables d'environnement Railway/Render/Fly, PAS un fichier committé)."
echo
echo "JWT_ACCESS_SECRET=\"$(openssl rand -hex 32)\""
echo "JWT_REFRESH_SECRET=\"$(openssl rand -hex 32)\""
echo
echo "# Ne jamais réutiliser ces valeurs entre plusieurs environnements (staging/prod)."
echo "# Relancer ce script pour régénérer — les anciens tokens émis avec l'ancien"
echo "# secret deviennent invalides dès que vous changez cette valeur (déconnexion globale)."
