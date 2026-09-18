---
name: sdd
description: Fluxo mestre de desenvolvimento orientado a spec (SDD) do Industria 24h, montado sobre o OpenSpec deste repo. Use no inicio de qualquer feature nova, refatoracao de arquitetura, hardening de seguranca ou bug complexo. Define a variante do pipeline, os gates humanos, o teto de rounds do loop de implementacao e o gate de subida.
---

# Pipeline SDD (Industria 24h)

Processo fixo. Nenhuma etapa e pulada. Regra central: **o agente que gera um artefato nunca e o que valida** — o validador roda como subagente de contexto limpo (skill `sdd-validate`).

Os artefatos sao os do OpenSpec, nao ha diretorio paralelo. Um change vive em `openspec/changes/<id>/`:

| Etapa SDD | Artefato neste repo |
|---|---|
| Discovery | skill `openspec-explore` (ou leitura do repo) → vira `proposal.md § Why` |
| User stories + PRD | `proposal.md` (Why / What Changes / Impact) |
| Decisao tecnica | `design.md` |
| SPEC | `specs/<capability>/spec.md` (requirement + scenario) |
| Planner / sprints | `tasks.md` numerado por fase |
| Loop coder⇄evaluator | skill `openspec-apply-change` + review, com o teto abaixo |
| Arquivo | skill `openspec-archive-change` |

## Variante pela natureza do pedido

| Pedido | Comeco | Depois |
|---|---|---|
| Feature nova | leia os modulos afetados (nao o repo todo), depois `openspec-propose` | fluxo completo |
| Arquitetura | mapeie candidatos, escolha **UM** alvo, junte evidencia (arquivo:linha) no `design.md § Context` | spec em diante |
| Seguranca | auditoria por dominio (segredos, auth, RLS/isolamento, duplicacao, logica, OWASP), consolide os findings e **seja cetico com cada um** antes de virar escopo | spec em diante |
| Bug complexo | reproduza primeiro; bug reproduzido = 70% resolvido; nao-reproduzivel = instrumente e pare | spec reduzida |
| Bug simples | nao use o pipeline: fix direto + review |

## Gates humanos (pare e pergunte)

Depois de `proposal.md`, depois da spec validada e enriquecida, e antes do merge. Alem desses, todo gate do contrato de execucao: migration/schema, auth, cobranca, segredo, deploy, ampliacao de escopo.

## Loop de implementacao

Para cada fase de `tasks.md`, em ordem: implemente, depois revise o `git diff` com contexto limpo. Achado vira nova rodada. **Maximo 3 rodadas por fase**; na terceira sem convergir, pare, marque a fase como bloqueada e reporte ao operador. Nao siga para a proxima fase com fase anterior bloqueada.

Contexto just-in-time: passe ao implementador o range de linhas da spec e os arquivos-alvo da fase, nunca "leia o arquivo todo".

## Gate de subida

Nunca `master` direto. Branch propria (worktree — o checkout `web/` e compartilhado entre sessoes), `git diff` revisado, testes/lint/build verdes, checagem de colisao de numero de migration (`ls supabase/migrations | grep -oE '^[0-9]{4}' | sort | uniq -d`) refeita **antes do push**, nao so na criacao. Merge = decisao humana.

## Regras deste repo que o pipeline nao pode contornar

- DDL/DML novo em tabela com dado real: testar em `begin; ... select <verificacao>; rollback;` via `supabase db query --linked` antes de aplicar.
- "Migration aplicada" so e fato apos `db query --linked` confirmar o objeto no schema; `migration list` mente sob drift.
- Caminho do dinheiro (repasse, comissao, cupom, estorno): a spec descreve o invariante contabil explicitamente e a fase correspondente nasce com teste.
- Brief com diagnostico tecnico e hipotese, nao fato: verifique cada afirmacao no codigo/schema antes de virar escopo, e reporte a divergencia.
