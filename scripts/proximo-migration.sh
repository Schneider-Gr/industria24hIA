#!/usr/bin/env bash
# Próximo número livre de migration, e checagem de colisão.
#
# Por que este script existe: o job `migrations-lint` do CI barra número
# duplicado, mas só vê o que foi commitado. Em 17/09/2026 duas sessões
# escreveram uma `0180` ao mesmo tempo; a segunda conferiu com
# `git log --all` e não viu nada, porque a primeira ainda não tinha
# commitado. Colisão que chega ao repositório barra TODO PR novo do
# projeto, inclusive de terceiros, até alguém renumerar.
#
# Então aqui se olha dois lugares, não um:
#   1. origin/master, que cobre tudo que já foi mergeado
#   2. o diretório de migrations de TODOS os worktrees do repositório,
#      incluindo arquivo que ninguém commitou ainda
#
# Uso:
#   scripts/proximo-migration.sh            # próximo número livre
#   scripts/proximo-migration.sh --checar   # só verifica duplicados (sai 1 se houver)

set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

numeros() {
  # 1. master remoto: cobre tudo que já foi mergeado
  git ls-tree --name-only origin/master supabase/migrations/ 2>/dev/null || true

  # 2. o diretório de migrations de TODOS os worktrees, incluindo este e
  #    incluindo arquivo que ninguém commitou ainda. É o passo que faltava:
  #    a sessão vizinha tem o arquivo em disco antes de existir no git.
  git worktree list --porcelain | sed -n 's/^worktree //p' | while read -r w; do
    ls "$w/supabase/migrations/" 2>/dev/null || true
  done
}

todos="$(numeros | grep -oE '[0-9]{4}' | sort)"

if [ "${1:-}" = "--checar" ]; then
  # Duplicado só importa dentro do MESMO lugar: dois worktrees com a mesma
  # migration idêntica é o caso normal (uma branch atrás da outra). O que
  # este modo pega é duplicata no diretório deste checkout, que é a regra
  # exata do CI.
  dup="$(ls supabase/migrations/ | grep -oE '^[0-9]{4}' | sort | uniq -d)"
  if [ -n "$dup" ]; then
    echo "COLISÃO neste checkout:"
    echo "$dup"
    exit 1
  fi
  echo "sem colisão neste checkout"

  # Aviso separado: número que existe em outro worktree e não aqui é o
  # sinal de que outra sessão está trabalhando nele agora.
  meu_maior="$(ls supabase/migrations/ | grep -oE '^[0-9]{4}' | sort | tail -1)"
  alheio="$(echo "$todos" | sort -u | awk -v m="$meu_maior" '$1 >= m')"
  if [ "$(echo "$alheio" | wc -l)" -gt 1 ]; then
    echo "atenção: números em uso por outros worktrees a partir de $meu_maior:"
    echo "$alheio" | tr '\n' ' '
    echo
  fi
  exit 0
fi

maior="$(echo "$todos" | tail -1)"
printf '%04d\n' "$((10#$maior + 1))"
