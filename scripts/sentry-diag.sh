#!/usr/bin/env bash
# Consultas de diagnóstico Sentry para AIOps (correlação, anomalias, contexto p/ IA).
# Uso: ./sentry-diag.sh [novos|frequentes|checkout|regressoes|json <issue-query>]
set -euo pipefail
ORG="schneider-g5"; PROJECT="industria24h-web"; API="https://sentry.io/api/0"
: "${SENTRY_AUTH_TOKEN:?Exporte SENTRY_AUTH_TOKEN}"
cli(){ sentry-cli --auth-token "$SENTRY_AUTH_TOKEN" issues list -o "$ORG" -p "$PROJECT" "$@"; }

case "${1:-novos}" in
  novos)      cli --query "is:unresolved firstSeen:-24h" --max-rows 25 ;;
  frequentes) cli --query "is:unresolved" --max-rows 25 ;;              # ordenação padrão = freq
  checkout)   cli --query "is:unresolved checkout" --max-rows 25 ;;     # fluxo crítico Asaas
  regressoes) cli --query "is:regressed" --max-rows 25 ;;
  json)       shift
              # saída JSON crua p/ pipeline de IA (contexto estruturado, não tabela)
              curl -sf -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" \
                "$API/projects/$ORG/$PROJECT/issues/?query=$(printf %s "${*:-is:unresolved}" | sed 's/ /%20/g')&limit=25" ;;
  *) echo "uso: $0 [novos|frequentes|checkout|regressoes|json <query>]"; exit 1 ;;
esac
