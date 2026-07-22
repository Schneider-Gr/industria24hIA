---
name: git-colaboracao
description: Fluxo git/GitHub do Industria24h para trabalho em equipe — múltiplas sessões de agentes e colaboradores humanos em paralelo. Use ao criar branch, commitar, abrir PR, resolver conflito, iniciar sessão de dev, ou orquestrar agentes que editam código.
---

# Git / GitHub em Equipe — Industria24h

## Topologia dos repositórios (não confundir)

- **`Industria24IA/`** = repo LOCAL, sem remote. Docs de engenharia reversa + skills. Compartilha via merge local entre branches.
- **`Industria24/web/`** = repo do GitHub com o app Next.js, PRs e CI. É onde `gh` funciona.
- Worktrees do app: `web-checkout`, `web-hotfix`, `web-transportadoras`, etc. + `web-worktrees/`.

## Regra nº 1: uma sessão por working tree

Duas sessões no mesmo tree é a fricção nº1 do projeto (reverte arquivo do outro, troca branch no meio do commit, corrompe node_modules). Trabalho de dev novo → `EnterWorktree` ANTES do primeiro Edit. Agentes que editam em paralelo → `isolation: 'worktree'`.

## Início de sessão

1. `git config user.email` — só `industria24hs` (Schneider-Gr) ou `revgrow7@gmail.com` commitam. Corrigir antes do primeiro commit.
2. `git status -sb` — se houver mudanças que você não fez, é outra sessão: não sobrescrever, não commitar junto, perguntar.
3. Tarefa herdada (bug, backlog, memória) → reler o código ATUAL primeiro; outra sessão pode já ter corrigido (já aconteceu: 7/11 bugs resolvidos em PR paralelo).

## Branch e commit

- Nunca commitar em main/master; sempre branch + PR, mesmo sozinho.
- Conventional Commits em português (`feat:`, `fix:`, `docs:`, `chore:`).
- Mensagem multi-linha: Write do arquivo + `git commit -F <arquivo>` (here-string PowerShell mangia acento).
- Repo com hook graphify: `GRAPHIFY_SKIP_HOOK=1 git commit …`.
- Commitar só o que é seu: stage por path explícito, nunca `git add .` num tree que outras sessões tocam (este diretório tem skills de terceiros soltas e um repo git embutido em `.claude/skills/stop-slop`).

## Antes do push / PR

1. **Colisão de migration DE NOVO** (a checagem da criação não basta — outra sessão pode ter publicado o número no meio): `ls supabase/migrations | grep -oE '^[0-9]{4}' | sort | uniq -d` vazio. Master colidido = renumerar antes de tudo; CI barra TODOS os PRs do repo.
2. Lint e testes passando (binários locais `node_modules/.bin/`, nunca `npx` — trunca argv no Windows).
3. Rebase sobre master atual para pegar trabalho paralelo antes do PR, não depois do conflito.

## PR e revisão

- `gh` CLI para PRs/issues/API (nunca browser para isso).
- PR pequeno e de tema único; descrição diz o que verificar e como (rota, query, teste).
- "Mergeado" ≠ "em produção": ver skill `deploy-industria24`.
- Ao concluir marco, gravar checkpoint na memória do projeto para a próxima sessão (skill `fila-retomada`).

## Conflito e recuperação

- Conflito com trabalho de outra sessão: resolver preservando os dois; em dúvida sobre intenção alheia, perguntar em vez de descartar.
- Nunca `push --force` em branch compartilhada; `--force-with-lease` só em branch própria de PR.
- Operação destrutiva (`reset --hard`, `checkout --`) só depois de conferir que o que se perde é seu.
