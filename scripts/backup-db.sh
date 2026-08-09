#!/usr/bin/env bash
# Sauvegarde la base Postgres de production (pg_dump, format custom compressé).
#
# Usage :
#   DATABASE_URL="postgresql://..." ./scripts/backup-db.sh [dossier_sortie]
#
# Par défaut écrit dans ./backups/ (créé si absent), nommé
# universenfants_YYYYmmdd_HHMMSS.dump — restaurable avec ./scripts/restore-db.sh.
set -euo pipefail
cd "$(dirname "$0")/.."

command -v pg_dump >/dev/null || { echo "pg_dump est requis (paquet postgresql-client)" >&2; exit 1; }
: "${DATABASE_URL:?DATABASE_URL doit être défini (pointant vers la base de production)}"

OUT_DIR="${1:-./backups}"
mkdir -p "$OUT_DIR"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
OUT_FILE="$OUT_DIR/universenfants_${TIMESTAMP}.dump"

# DATABASE_URL au format Prisma inclut souvent "?schema=public", une
# extension propre à Prisma que pg_dump ne reconnaît pas comme paramètre URI.
PG_URL="${DATABASE_URL%%\?*}"

echo "==> Sauvegarde de la base vers $OUT_FILE"
pg_dump --format=custom --no-owner --no-privileges --dbname="$PG_URL" --file="$OUT_FILE"

SIZE="$(du -h "$OUT_FILE" | cut -f1)"
echo "✅ Sauvegarde terminée ($SIZE) : $OUT_FILE"
echo
echo "Pour restaurer : ./scripts/restore-db.sh $OUT_FILE"
