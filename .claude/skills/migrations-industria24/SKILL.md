---
name: migrations-industria24
description: Criar, numerar, aplicar e verificar migrations Supabase do Industria24h. Use SEMPRE ao criar migration nova, aplicar SQL em produção, investigar drift, ou quando o CI falhar em migrations-lint.
---

# Migrations Supabase — Industria24h

Projeto real de produção: **`tiwdqgyeyvceaiqqwitc`** (conta industria24hs@gmail.com). O MCP supabase pode apontar para org errada — em dúvida, usar CLI linkada a partir de `web/`. "Produção" = o projeto que o `.env` do app aponta, nunca o primeiro que o MCP lista.

## Numeração (colisão já quebrou o CI 3×: 0014, 0030, 0064)

- Migrations vivem em `supabase/migrations/` com prefixo numérico manual.
- **Antes de criar:** `git log --all --oneline -- supabase/migrations/00XX*` (todas as branches).
- **Antes do push/PR (obrigatório, de novo):** `cd supabase/migrations && ls | grep -oE '^[0-9]{4}' | sort | uniq -d` — deve sair vazio. Outra sessão pode ter publicado o mesmo número depois da sua checagem inicial.
- Master colidido = renumerar é a PRIMEIRA tarefa; enquanto houver duplicata, o job `migrations-lint` barra todo PR do repo, inclusive de terceiros.

## Aplicar e verificar

- Aplicar via `supabase db query --linked --file <arquivo>` (egress shell→Supabase direto é bloqueado; nunca `curl`).
- **"Aplicada" só é fato com o objeto no schema:** confirmar com `to_regclass('public.tabela')` / `information_schema`. `supabase migration list` MENTE sob drift (histórico parou em 0057 enquanto o banco tinha 0067).
- DDL/DML sobre tabela com dado real: testar antes em `begin; <sql>; select <verificação>; rollback;`. Isso já pegou `UPDATE ... FROM` inválido (42P01) em migration de comissão.
- Saída do CLI é latin-1 — não pipe direto para `json.load`.

## Segurança

- Toda tabela nova nasce com RLS ativado e negar-por-padrão (não replicar o padrão aberto do Bubble).
- `gen types` sem token TRUNCA `database.types.ts` — conferir o arquivo depois de gerar.
- RLS é testável via `db query --linked` + `set_config` (ver `docs/` rls_smoke.sql).
