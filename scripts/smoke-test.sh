#!/usr/bin/env bash
# Vérifications automatisables de la checklist post-déploiement
# (voir DEPLOYMENT.md). Ne remplace pas les étapes manuelles (commande test,
# upload d'image, changement du mot de passe admin) — les complète.
#
# Usage :
#   ./scripts/smoke-test.sh <api_url> <web_url> <admin_url>
#   ./scripts/smoke-test.sh https://api.example.com https://boutique.example.com https://admin.example.com
set -uo pipefail

API_URL="${1:?Usage: ./scripts/smoke-test.sh <api_url> <web_url> <admin_url>}"
WEB_URL="${2:?Usage: ./scripts/smoke-test.sh <api_url> <web_url> <admin_url>}"
ADMIN_URL="${3:?Usage: ./scripts/smoke-test.sh <api_url> <web_url> <admin_url>}"

PASS=0
FAIL=0

check() {
  local label="$1" expected_code="$2" actual_code="$3"
  if [ "$actual_code" = "$expected_code" ]; then
    echo "✅ $label ($actual_code)"
    PASS=$((PASS + 1))
  else
    echo "❌ $label — attendu $expected_code, reçu $actual_code"
    FAIL=$((FAIL + 1))
  fi
}

echo "==> API health"
HEALTH_BODY="$(curl -sS "$API_URL/api/health" || echo '{}')"
HEALTH_CODE="$(curl -sS -o /dev/null -w '%{http_code}' "$API_URL/api/health")"
check "GET /api/health" "200" "$HEALTH_CODE"
echo "    $HEALTH_BODY"
case "$HEALTH_BODY" in
  *'"status":"ok"'*) echo "✅ database + redis up" ; PASS=$((PASS + 1)) ;;
  *) echo "❌ health body ne rapporte pas status=ok — vérifier les logs API" ; FAIL=$((FAIL + 1)) ;;
esac

echo "==> Swagger doit être désactivé en production"
DOCS_CODE="$(curl -sS -o /dev/null -w '%{http_code}' "$API_URL/api/docs")"
check "GET /api/docs renvoie 404" "404" "$DOCS_CODE"

echo "==> Catalogue public accessible"
PRODUCTS_CODE="$(curl -sS -o /dev/null -w '%{http_code}' "$API_URL/api/products?limit=1")"
check "GET /api/products" "200" "$PRODUCTS_CODE"

echo "==> Recherche (Meilisearch ou repli Postgres, les deux doivent répondre)"
SEARCH_CODE="$(curl -sS -o /dev/null -w '%{http_code}' "$API_URL/api/products?q=jouet&limit=1")"
check "GET /api/products?q=..." "200" "$SEARCH_CODE"

echo "==> Boutique accessible"
WEB_CODE="$(curl -sS -o /dev/null -w '%{http_code}' "$WEB_URL/fr")"
check "GET $WEB_URL/fr" "200" "$WEB_CODE"

echo "==> Back-Office accessible (page de login)"
ADMIN_CODE="$(curl -sS -o /dev/null -w '%{http_code}' "$ADMIN_URL/login")"
check "GET $ADMIN_URL/login" "200" "$ADMIN_CODE"

echo
echo "== Résumé : $PASS OK / $FAIL échec(s) =="
echo
echo "Étapes manuelles restantes (voir DEPLOYMENT.md) :"
echo "  - Se connecter au Back-Office et changer le mot de passe admin par défaut"
echo "  - Passer une commande test de bout en bout et vérifier l'email de confirmation"
echo "  - Uploader une image produit et vérifier qu'elle s'affiche depuis R2"

[ "$FAIL" -eq 0 ] || exit 1
