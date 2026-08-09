#!/usr/bin/env bash
# Restaure une sauvegarde produite par ./scripts/backup-db.sh.
#
# ⚠ DESTRUCTIF : remplace le contenu de la base cible. Demande une
# confirmation explicite avant d'agir.
#
# Usage :
#   DATABASE_URL="postgresql://..." ./scripts/restore-db.sh chemin/vers/fichier.dump
set -euo pipefail

command -v pg_restore >/dev/null || { echo "pg_restore est requis (paquet postgresql-client)" >&2; exit 1; }
: "${DATABASE_URL:?DATABASE_URL doit être défini (pointant vers la base cible)}"

DUMP_FILE="${1:?Usage: DATABASE_URL=... ./scripts/restore-db.sh <fichier.dump>}"
[ -f "$DUMP_FILE" ] || { echo "Fichier introuvable : $DUMP_FILE" >&2; exit 1; }

# Voir backup-db.sh : DATABASE_URL au format Prisma inclut souvent
# "?schema=public", que pg_restore ne reconnaît pas comme paramètre URI.
PG_URL="${DATABASE_URL%%\?*}"

echo "⚠️  Ceci va écraser le contenu de la base pointée par DATABASE_URL avec :"
echo "    $DUMP_FILE"
echo
read -r -p "Taper EXACTEMENT 'restaurer' pour confirmer : " CONFIRM
if [ "$CONFIRM" != "restaurer" ]; then
  echo "Annulé."
  exit 1
fi

echo "==> Restauration en cours..."
pg_restore --clean --if-exists --no-owner --no-privileges --dbname="$PG_URL" "$DUMP_FILE"

echo "✅ Restauration terminée."
