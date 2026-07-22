---
name: rls-seguranca
description: RLS e segurança do Industria24h — políticas Supabase, tipos sensíveis, segredos, auditoria. Use ao criar tabela, escrever/alterar policy, tocar dados sensíveis, ou em qualquer trabalho de hardening/auditoria de segurança.
---

# RLS e Segurança — Industria24h

## RLS

- **Negar por padrão, liberar explicitamente.** Toda tabela nova nasce com RLS ativado e sem policy até haver regra documentada. Nunca replicar o padrão aberto do Bubble (Data API expõe tudo).
- **Testar policy de verdade:** `supabase db query --linked` + `set_config('request.jwt.claims', ...)` simulando o usuário — técnica validada na auditoria de 09-10/07; `rls_smoke.sql` passa e serve de modelo.
- Auditoria RLS encerrada (0032 no banco); resta 1 decisão humana (achado 3) — não reabrir o resto.
- Escrita privilegiada (ex.: carimbo de aceite de termos) via service role em rota server-side, nunca expondo a chave no client.

## Tipos/dados sensíveis

- `Cards`, `CardTime`, `credenciaisAPIs`: qualquer código que os toque exige revisão extra antes de merge (CLAUDE.md do repo).
- Chave PIX do lojista e dados bancários: trilha de auditoria existente do PR #14 — manter o padrão.

## Segredos

- 🔴 Pendências conhecidas de rotação: PAT Supabase exposto (CrewAI Studio) e token Bubble. ~10 segredos em texto puro nos configs mapeados no hardening 21/07 (PR #72).
- Segredo encontrado em texto puro (código, doc, bubble-export): parar, avisar, recomendar rotação. Segredo colado no chat: responder com one-liner `!` para o usuário exportar fora do transcript e rotacionar.
- Nunca gravar segredo em markdown, commit ou log.

## Hardening

- PR #72 cobriu deps/headers/CI. Pendente: DMARC/DKIM no Resend, rotações acima.
- Novo endpoint público = validar input na borda + rate limit se for de escrita.
