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

## Views que contornam RLS de propósito (advisor "Security Definer View")

O advisor do Supabase (lint `security_definer_view`) sinaliza toda view sem
`security_invoker=true` como ERROR. Neste projeto, 11 views são falso
positivo estrutural — cada uma substitui uma RLS policy que vazava PII/
financeiro (ver 0124/0126/0130) ou expõe agregação pública (count/avg) sobre
tabela com RLS "dono só vê a própria linha": `lojas_vitrine`,
`afiliado_ganhos`, `logistica_pedidos`, `logistica_itens`, `pedidos_cliente`,
`linha_itens_cliente`, `parceiros_publicos`, `coletiva_pagamentos`,
`favoritos_contagem`, `avaliacoes_produto_resumo`,
`coletiva_participantes_total`.

- **Nunca aplicar `security_invoker=true` nessas views** — reaplica a RLS
  da tabela base, que foi removida/nunca existiu para esses papéis; zera o
  resultado para anon/authenticated (vitrine pública e painéis quebram).
  Motivo arquitetural: `anon`/`authenticated` são papéis únicos
  compartilhados no Supabase/PostgREST, não há role por usuário — não dá
  para restringir por linha via GRANT sem fragmentar o papel (fora de
  escopo).
- **O fix real é `alter view ... set (security_barrier = true)`** — não
  silencia o advisor (ele continua ERROR), mas fecha o side-channel real:
  sem isso, o planner pode empurrar uma função do lado do consumidor para
  antes do filtro de tenant da view (`afiliado_id = auth.uid()` etc.),
  vazando linhas via erro/timing de uma função marcada leaky.
- View nova com o mesmo padrão (agregação pública ou substituta de policy
  removida) nasce já com `security_barrier=true` na mesma migration que a
  cria — não esperar o advisor reportar antes de aplicar.
- Verificar em produção com `select relname, reloptions from pg_class where
  relname = '<view>'` via `supabase db query --linked` — nunca confiar só
  no advisor/`migration list` (mente sob drift).

## Hardening

- PR #72 cobriu deps/headers/CI. Pendente: DMARC/DKIM no Resend, rotações acima.
- Novo endpoint público = validar input na borda + rate limit se for de escrita.
