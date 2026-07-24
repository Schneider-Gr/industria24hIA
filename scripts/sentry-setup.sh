#!/usr/bin/env bash
# Setup de monitoramento Sentry do industria24h para AIOps.
# Idempotente: o projeto schneider-g5/industria24h-web JÁ EXISTE — só cria se sumir.
# Requer: SENTRY_AUTH_TOKEN exportado (scopes project:write, org:read, event:read).
set -euo pipefail

ORG="schneider-g5"
PROJECT="industria24h-web"
TEAM="$ORG"
API="https://sentry.io/api/0"
ENV_FILE="$(dirname "$0")/../.env.local"

: "${SENTRY_AUTH_TOKEN:?Exporte SENTRY_AUTH_TOKEN antes de rodar}"
auth=(-H "Authorization: Bearer $SENTRY_AUTH_TOKEN")

command -v sentry-cli >/dev/null || npm i -g @sentry/cli

# 1. Projeto: cria só se não existir (sentry-cli não cria projeto; API REST)
if ! curl -sf "${auth[@]}" "$API/projects/$ORG/$PROJECT/" >/dev/null; then
  echo "Projeto ausente — criando $ORG/$PROJECT"
  curl -sf "${auth[@]}" -H "Content-Type: application/json" \
    -d "{\"name\":\"$PROJECT\",\"slug\":\"$PROJECT\",\"platform\":\"javascript-nextjs\"}" \
    "$API/teams/$ORG/$TEAM/projects/" >/dev/null
else
  echo "Projeto $ORG/$PROJECT já existe — pulando criação"
fi

# 2. DSN da primeira client key do projeto
DSN=$(curl -sf "${auth[@]}" "$API/projects/$ORG/$PROJECT/keys/" \
  | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.parse(d)[0].dsn.public))')
echo "DSN: $DSN"

# 3. Grava no .env.local sem duplicar chaves
touch "$ENV_FILE"
for kv in "NEXT_PUBLIC_SENTRY_DSN=$DSN" "SENTRY_ORG=$ORG" "SENTRY_PROJECT=$PROJECT"; do
  k="${kv%%=*}"
  grep -q "^$k=" "$ENV_FILE" && sed -i "s|^$k=.*|$kv|" "$ENV_FILE" || echo "$kv" >> "$ENV_FILE"
done
echo "Env atualizado em $ENV_FILE (SENTRY_AUTH_TOKEN fica fora do repo, só na shell/Vercel)"

# 4. Smoke: comandos de diagnóstico funcionam?
sentry-cli --auth-token "$SENTRY_AUTH_TOKEN" issues list -o "$ORG" -p "$PROJECT" --max-rows 5 \
  && echo "OK: consulta de issues funcionando. Use scripts/sentry-diag.sh para diagnósticos."
