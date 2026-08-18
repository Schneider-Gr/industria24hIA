## Context

Ver `proposal.md - Why` para a motivação. Este design cobre a abordagem técnica comum às 8 capabilities e as decisões específicas de cada uma. Constraints já conhecidas do projeto (ver `CLAUDE.md` e skills relevantes): egress shell→Supabase bloqueado (query só via `db query --linked`), env vars "Sensitive" da Vercel voltam vazias em `env pull`, Sentry já instrumentado no site principal (`@sentry/nextjs`), Langfuse já validado nos crews de IA, plano Vercel Hobby limita cron a 1x/dia.

## Goals / Non-Goals

**Goals:**
- Padrão único de "registro de execução/evento observável" reaproveitável nas 8 capabilities, evitando 8 implementações divergentes de logging.
- Priorizar a instrumentação por risco: cron jobs (menor blast radius) primeiro; checkout financeiro e webhooks Asaas (caminho do dinheiro) por último, com revisão extra e sem alterar comportamento de negócio existente.
- Reaproveitar infraestrutura já validada (Sentry, Langfuse, dashboard-ops) em vez de introduzir ferramenta nova.

**Non-Goals:**
- Alertas automáticos por push/e-mail/Slack (fica para change futuro, se o valor de visibilidade passiva não for suficiente).
- Retry automático de qualquer processo que falhar — este change cobre visibilidade, não correção automática.
- Mover cron de plataforma (sair da Vercel Cron) — fora de escopo.
- Cobertura de Visual Connect ou Instal-Visual — escopo é só industria24.com.br.

## Decisions

1. **Tabela `observabilidade_eventos` genérica em vez de uma tabela por capability.**
   Colunas: `id`, `capability` (enum/text: `cron`, `checkout`, `webhook_asaas`, `agente_ia`, `rls`, `integracao_terceiro`, `rate_limit`, `migration_drift`), `origem` (nome específico dentro da capability, ex. nome do cron ou da integração), `resultado` (`sucesso`/`falha`/`alerta`), `motivo` (texto, nullable), `metadata` (jsonb, para dado específico de cada capability sem alterar schema), `created_at`.
   Alternativa considerada: tabela dedicada por capability (8 tabelas). Rejeitada por aumentar a superfície de migration e duplicar a mesma consulta de histórico 8 vezes, sem benefício de negócio claro — todas as capabilities compartilham o mesmo formato de "evento observável".

2. **Sentry para alerta de caminho crítico (financeiro), tabela própria para histórico/consulta operacional (cron, RLS, drift, etc.).**
   Sentry já está instrumentado e é a ferramenta correta para "algo quebrou e precisa de atenção imediata" (checkout, webhooks Asaas). A tabela `observabilidade_eventos` serve para histórico consultável no dashboard-ops, onde o valor é visão agregada ao longo do tempo, não alerta imediato. As duas não são mutuamente exclusivas: checkout financeiro usa as duas (Sentry para alerta, tabela para histórico de auditoria).

3. **Helper único `lib/observabilidade/registrar-evento.ts`** com assinatura `registrarEvento({capability, origem, resultado, motivo?, metadata?})`, chamado a partir de cada rota/função instrumentada. Não bloqueante — falha ao registrar não deve lançar exceção que interrompa o fluxo principal (ver Requirement "Alerta não bloqueia a transação do usuário" em `observabilidade-checkout-financeiro`).
   Alternativa considerada: middleware/wrapper genérico que envolve toda rota de API automaticamente. Rejeitada nesta primeira iteração — o conjunto de rotas afetadas é heterogêneo (cron, webhook, RLS via trigger de banco), um wrapper único não cobre RLS (que roda no Postgres, não em rota Next.js).

4. **RLS: log de negação via trigger/função no Postgres, não em código da aplicação.**
   Negação de RLS acontece no nível do banco, antes de qualquer código da aplicação processar a resposta — a aplicação só vê "zero linhas retornadas" ou erro, sem sinal confiável de que foi uma negação de policy especificamente. A instrumentação correta é uma função de log chamada a partir de policy ou de um mecanismo de auditoria do Postgres, não um `try/catch` no Next.js.

5. **Verificação de drift de migrations como script/rotina agendada, não como parte do CI.**
   O CI já tem o job `migrations-lint` para colisão de prefixo numérico (checagem estática, sem acesso a produção). Drift real (schema de produção vs. histórico esperado) exige `db query --linked`, que não roda em CI (egress bloqueado fora do ambiente autorizado) — vira uma rotina agendada (cron ou RemoteTrigger, como o já existente para complexidade ciclomática) que roda com acesso à CLI Supabase linkada.

6. **`observabilidade-rate-limit-apis` e `observabilidade-integracoes-terceiros` compartilham o mesmo mecanismo de check periódico**, diferindo apenas no que verificam (rate limit restante vs. validade de token). Ambos usam o mesmo helper de registro de evento e o mesmo padrão de alerta por limiar.

## Risks / Trade-offs

- [Tabela genérica `observabilidade_eventos` pode crescer rápido em volume (polling de 30s em múltiplas fontes)] → aplicar retenção (ex.: 30-90 dias) e índice por `capability` + `created_at`; decisão de retenção exata fica para `tasks.md`/implementação, não é requisito de comportamento (spec não define retenção).
- [Instrumentar checkout financeiro e webhooks Asaas tem risco de introduzir regressão em código que já lida com dinheiro real] → sequenciado por último nas tasks, com testes (`vitest`, seguindo o padrão Red-Green-Refactor já exigido pelo projeto) antes de qualquer merge, e revisão humana explícita antes de aplicar em produção.
- [Log de negação de RLS pode ficar ruidoso se muitas negações forem esperadas (ex.: tentativa de acesso cross-tenant legítima e comum)] → o requirement de "sinalização de padrão suspeito" (não toda negação isolada) mitiga ruído; threshold exato de repetição fica para implementação.
- [Verificação de drift de migrations pode gerar falso positivo se rodar durante uma migration em andamento] → rotina deve rodar fora de janela de deploy ativo, ou tolerar uma janela de retry antes de alertar.

## Migration Plan

1. Migration Supabase criando `observabilidade_eventos` (RLS ativado, sem policy pública — só service role escreve, dashboard-ops lê via rota autenticada/service role).
2. Implementar `lib/observabilidade/registrar-evento.ts`.
3. Aplicar capability por capability, na ordem de risco crescente definida em `tasks.md` — cada uma é um PR isolado e revisável, não um único PR gigante.
4. Nenhuma capability desta change altera comportamento de negócio existente (todas são `ADDED Requirements` — nenhum `MODIFIED`/`REMOVED`) — rollback de qualquer PR é reverter o merge, sem necessidade de rollback de dado (a tabela nova não é lida por nenhum fluxo de negócio existente).

## Open Questions

- Status real de agendamento de `/api/coletivas/tick` (não está em nenhum `vercel.json` hoje) — investigar antes de instrumentar essa rota especificamente dentro de `observabilidade-cron-jobs`; não bloqueia as demais capabilities nem muda a spec (a spec cobre "toda rota de cron", independente de quantas existirem).
- Retenção exata da tabela `observabilidade_eventos` e do log de negação RLS — decisão de implementação, não de comportamento; pode ser resolvida em `tasks.md` sem reabrir a spec.
