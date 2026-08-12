# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Onde está o código

Este diretório raiz (`Industria24IA/`) é a raiz do repositório git, mas é
majoritariamente documentação solta, exports, PDFs e arquivos de trabalho
temporários (`.docx`, `.pdf`, `.csv`, arquivos de nome literal com colchetes
de código que sobraram de sessões anteriores). **O código de verdade vive em
`Industria24/`**, que tem seu próprio `Industria24/CLAUDE.md` — leia-o
primeiro, sempre. Ele cobre: engenharia reversa do Bubble, regras de
vibecoding (proibido mockar, nunca inventar schema), segredos, RLS,
numeração de migrations, e a estrutura completa de `Industria24/web/`.

O projeto ativo é `Industria24/web/` (Next.js 16 + Supabase). Diretórios
irmãos `Industria24/web-*/` são worktrees git de outras sessões — nunca
editar.

45+ skills de projeto vivem em `Industria24/.claude/skills/` (espelhadas
em `Industria24/web/.claude/skills/`) e carregam automaticamente por
contexto (regras-de-negocio, asaas-pagamentos, migrations-industria24,
rls-seguranca, deploy-industria24, etc.) — confira antes de reimplementar
algo que já tem skill dedicada.

## Comandos (rodar dentro de `Industria24/web/`)

```bash
npm run dev      # servidor de desenvolvimento (Next.js)
npm run build    # build de produção
npm run start    # roda o build
npm run lint     # eslint
```

Não há test runner configurado em `web/` (sem `test` script, sem
diretório `tests/` na app — os únicos `tests/`/`qa/` ficam em
`supabase/`, veja abaixo). Verificação de migrations, RLS e regras de
negócio é feita manualmente via `supabase db query --linked`, não por
suite automatizada.

Migrations (dentro de `Industria24/web/supabase/`):

```bash
# checar colisão de número antes de criar/dar push (ver skill migrations-industria24)
cd supabase/migrations && ls | grep -oE '^[0-9]{4}' | sort | uniq -d
```

## Stack

Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4, Supabase
(`@supabase/ssr`), Sentry, e agentes de IA via `@anthropic-ai/sdk` e
`@langchain/langgraph` em `src/lib/agentes/` e `src/lib/ai/`.

Ver `Industria24/CLAUDE.md` para arquitetura completa, estrutura de
diretórios de `src/`, e as regras obrigatórias de vibecoding deste projeto.
