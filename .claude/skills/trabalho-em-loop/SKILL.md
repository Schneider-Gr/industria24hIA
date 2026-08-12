---
name: trabalho-em-loop
description: Converter tarefas de prompt único em execução contínua — /loop, agendamento recorrente, background e workflows. Use quando o usuário pedir para monitorar algo, repetir uma tarefa, "ficar de olho", rodar em loop, ou quando um pedido pontual claramente precisa de re-execução periódica.
---

# Trabalho em loop (em vez de prompt único)

## Papel

Você identifica quando um pedido pontual é na verdade uma tarefa recorrente e escolhe o mecanismo de continuidade certo — sem polling desperdiçado e sem loop sem critério de parada.

## Objetivo

Antes de responder um pedido pontual, perguntar-se: isso vai ser pedido de novo amanhã? Se sim, propor a forma contínua em vez de executar uma vez e esquecer.

## Procedimento — escolher o mecanismo

| Situação | Mecanismo |
|---|---|
| Repetir comando/skill nesta sessão em intervalo ("checa o deploy a cada 5min") | `/loop 5m <comando>` |
| Repetir com ritmo variável — o modelo decide quando voltar | `/loop <tarefa>` sem intervalo (self-paced via ScheduleWakeup) |
| Tarefa recorrente FORA da sessão (diária, semanal) | `/schedule` (agente cloud com cron) |
| Comando longo que não preciso esperar | Bash/PowerShell com `run_in_background` — a notificação chega sozinha |
| Fan-out sobre lista conhecida (N arquivos, N achados) | `Workflow` com `pipeline()` — só com opt-in explícito do usuário |
| Loop LLM dentro de um PRODUTO (gerar→validar→corrigir) | skill `langgraph-loop` — é código, não orquestração de sessão |

## Cadência (self-paced)

- Polling de estado externo rápido (CI, deploy Vercel): 60–270s (cache quente).
- Espera longa ou tick ocioso: 1200–1800s. **Nunca 300s** (pior dos dois mundos).
- Trabalho rastreado pelo harness (subagente, background task) notifica sozinho — agendar só fallback longo (1200s+), jamais poll curto.

## Padrão de cada iteração

1. Verificar a condição (comando de checagem — nunca sleep primeiro; sleep solto é bloqueado por hook).
2. Mudou algo → agir e reportar em 1-2 frases o DELTA, não o histórico inteiro.
3. Condição de parada explícita ("até o deploy ficar READY", "até 3 rodadas sem vaga nova").

## Regras estritas

- ⛔ Loop sem critério de parada é bug — nunca iniciar sem definir quando termina.
- ⛔ Nunca fazer polling de trabalho que o harness já notifica.
- ⛔ Nunca `sleep`/`Start-Sleep` solto (hook bloqueia) — Monitor/until-loop.
- ⛔ Não recriar crons que já existem no banco (sincronizações Supabase) — monitorar via `db query --linked`.

## Loops recorrentes deste usuário (propor quando encaixar)

- Pós-deploy VC/Instal-Visual: checar deployment READY + logs de edge → parar quando saudável.
- `/atualizar-vagas` diário via `/schedule`.
- Refresh manual do override CostMemento SP (skill `crm-acuracidade`) — candidato a `/schedule` semanal enquanto o endpoint interno não é mapeado.

## Saída esperada

Ao propor: mecanismo escolhido + cadência + critério de parada, em 2-3 frases. A cada iteração: só o delta. Ao encerrar: por que o critério de parada foi atingido.
