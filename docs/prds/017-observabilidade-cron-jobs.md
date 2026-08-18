---
prd_number: "017"
status: rascunho
priority: alta
created: 2026-08-17
issue: ""
depends_on: ["016"]
references:
  - "vercel.json" # cron carrinho/abandono/tick, projeto principal
  - "dashboard-ops/vercel.json" # cron push-metrics
  - ".claude/skills/dashboard-observabilidade/SKILL.md" # bug documentado da lib prometheus-remote-write
---

# PRD 017: Observabilidade de Cron Jobs

## 1. Contexto

- **Produto/área**: confiabilidade operacional do backend do Industria24h — cobre todo job agendado (Vercel Cron) do projeto, não uma feature de negócio específica.
- **Estado atual**: existem hoje 3 rotas de cron identificadas no código — `/api/carrinho/abandono/tick` (registrada em `vercel.json` do projeto principal, roda diariamente às 12h UTC), `/api/coletivas/tick` (rota existe mas **não está registrada em nenhum `vercel.json`** — hoje depende de disparo externo/manual, sem agendamento automático confirmado) e `/api/push-metrics` (projeto `dashboard-ops`, roda diariamente às 11h UTC). Nenhuma delas tem alerta ou log estruturado de falha — o único jeito de saber se rodou é checar o efeito colateral esperado (e-mail de carrinho abandonado enviado, dado de coletiva atualizado, métrica no Prometheus) ou os logs brutos da Vercel.
- **Problema**: cron que falha silenciosamente é o modo de falha mais caro que existe, porque não há sintoma imediato — só aparece quando alguém nota a ausência de um efeito esperado, dias ou semanas depois. Já ocorreu um caso documentado (`push-metrics`): a lib usada (`prometheus-remote-write`) não lança exceção em falha HTTP, retornando `{status, statusText, errorMessage}` mesmo em 401/500 — se o código só faz `await pushMetrics(...)` sem checar `result.status`, uma falha de autenticação passa despercebida indefinidamente.

> **Contexto técnico** (Vercel Cron, limites do plano Hobby, Next.js route handlers) vive na skill `dashboard-observabilidade` e no TRD; aqui cobre-se comportamento e regra de produto — o que "cron saudável" significa e o que fazer quando não está.

## 2. Solução Proposta

### Visão de produto

- Todo cron do projeto reporta seu resultado (sucesso/falha, com motivo) num lugar visível a um operador, sem exigir leitura de log bruto da Vercel.
- Falha de cron gera um estado observável e persistente até ser resolvido — não um evento que passa e desaparece nos logs.
- A checagem cobre tanto "o cron rodou" (Vercel disparou a rota) quanto "o cron funcionou" (a rota completou a ação sem erro de lógica/autenticação/dependência externa) — são falhas distintas e a distinção importa para o diagnóstico.
- Aplica-se a todo cron existente e a qualquer cron novo criado depois — é um padrão de implementação, não uma tarefa pontual em 3 rotas.

### Decisões de produto

1. **Toda rota de cron deve checar e registrar explicitamente o resultado de chamadas externas que não lançam exceção em falha** (ex.: `prometheus-remote-write`) — motivo: já causou um incidente de falha silenciosa documentado, não é risco hipotético.
2. **Falha de cron é reportada por execução, não agregada em métrica só** — motivo: para diagnosticar "por que falhou hoje" o operador precisa do evento específico (timestamp, motivo), não só um contador de falhas.
3. **A rota `/api/coletivas/tick`, hoje sem agendamento automático confirmado, precisa ter seu status de agendamento esclarecido antes ou durante a implementação deste PRD** *(premissa — confirme ou corrija: pode ser um gap real — cron esquecido — ou disparo intencional por outro mecanismo que eu não localizei no código; tratar como achado a validar, não como escopo automático de correção)*.

### Fora do escopo

- Alertas automáticos por push/e-mail/Slack quando um cron falha — este PRD cobre visibilidade (registrar e expor a falha), não notificação ativa; pode ser PRD futuro dependente deste.
- Retry automático de cron falho — o padrão aqui é reportar a falha, não tentar corrigi-la sozinho.
- Orquestração de cron fora da Vercel (ex.: mover para um scheduler externo) — fora de escopo, a plataforma de execução (Vercel Cron) não muda.
- Cobertura de crons de projetos fora do Industria24h (Visual Connect, Instal-Visual) — este PRD é escopado ao Industria24h; pode virar PRD irmão se o padrão se provar valioso.

## 3. Funcionalidades

### US01: Registrar resultado de cada execução de cron

Como operador do projeto, quero que toda execução de cron registre se teve sucesso ou falha (e o motivo, se falhou), para não depender de inferir o resultado pelo efeito colateral esperado.

**Rules:**
- Toda rota de cron (`/api/carrinho/abandono/tick`, `/api/coletivas/tick`, `/api/push-metrics`, e qualquer cron futuro) grava um registro de execução com: timestamp, sucesso/falha, e motivo da falha quando aplicável.
- Chamada a biblioteca externa que não lança exceção em falha HTTP (padrão já identificado em `prometheus-remote-write`) tem o status da resposta checado explicitamente — sucesso não pode ser assumido apenas por a chamada não ter lançado erro.
- O registro cobre tanto falha de infraestrutura (a rota não foi disparada) quanto falha de lógica (a rota rodou mas a ação de negócio não completou).

**Edge cases:**
- Cron nunca disparado no dia esperado (falha de agendamento da Vercel, não do código) → ausência de registro no dia é, em si, um sinal de falha — não deve ser confundido com "sucesso silencioso" nem ignorado.
- Cron dispara mas a dependência externa (Prometheus, provedor de e-mail, Supabase) está fora do ar → registrado como falha com o motivo específico da dependência, não como erro genérico.
- Duas execuções do mesmo cron no mesmo dia (reprocessamento manual) → cada execução gera seu próprio registro, sem sobrescrever a anterior.

### US02: Visualizar histórico de execução de crons

Como operador do projeto, quero ver o histórico recente de execuções de cada cron (sucesso/falha, quando foi a última execução), para diagnosticar rapidamente se algo parou de rodar.

**Rules:**
- Visão consolidada de todos os crons do projeto — não é preciso abrir rota por rota para saber o estado geral.
- Mostra, por cron: última execução (timestamp), resultado, e histórico recente o suficiente para notar um padrão de falha recorrente (não é necessário histórico ilimitado) *(premissa — confirme ou corrija: retenção de 30 dias é suficiente, alinhado ao padrão de outras métricas do dashboard-ops)*.
- Consumível a partir do painel já existente (`dashboard-ops`, ver PRD 016) — evita criar uma ferramenta nova onde uma já serve como base.

**Edge cases:**
- Cron que nunca rodou (recém-criado) → aparece como "sem histórico" de forma explícita, não como "última execução: nunca" indistinguível de erro de carregamento.
- Cron removido do código mas com histórico antigo → histórico permanece consultável, sinalizado como "cron não existe mais no código atual" *(premissa — confirme ou corrija: comportamento razoável para não perder rastro de incidentes passados, mas pode ser simplificado se não houver necessidade real)*.

## 4. Fluxo de Negócio

_Não aplicável — a feature é infraestrutura de visibilidade sobre um mecanismo técnico (cron), sem ramificação de regra de negócio própria além dos edge cases já descritos nas USs._

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| As 3 rotas de cron existentes registram resultado de execução (sucesso/falha + motivo) | sem isso, o incidente de falha silenciosa do `push-metrics` pode se repetir em qualquer cron, inclusive em rotas do caminho do dinheiro (carrinho abandonado) | forçar uma falha (credencial inválida, dependência indisponível) em cada uma das 3 rotas e confirmar que o registro reflete a falha e o motivo |
| Histórico de execução é visível sem acesso a log bruto da Vercel | reduz o tempo de diagnóstico de "cron não rodou" de minutos (abrir Vercel, procurar log) para segundos (olhar o painel) | abrir o painel e confirmar que a última execução de cada cron aparece sem precisar abrir a Vercel |
| Cron que não dispara no horário esperado é distinguível de cron que disparou e falhou | são causas diferentes (agendamento vs. lógica) e o diagnóstico correto depende de saber qual é | simular ausência de disparo (não aplicável a produção; validar via revisão do desenho de dados — ausência de registro no dia esperado deve ser interpretável como tal) |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| Crons com registro de execução implementado | 0 de 3 (nenhum cron registra resultado hoje) | 3 de 3 | A levantar | Pelo menos os 3 crons existentes cobertos, sem exceção | Dono do projeto |
| Incidentes de falha silenciosa de cron detectados tardiamente (> 24h) | 1 conhecido até hoje (`push-metrics`, ver skill `dashboard-observabilidade`) | 0 daqui em diante | Contínuo, a partir da entrega | Qualquer falha visível em até 24h da ocorrência | Dono do projeto |

## 6. Milestones

### Milestone 1: Visibilidade de falha nos crons existentes

**Por que é um marco:** primeira vez que uma falha de cron (como a já ocorrida no `push-metrics`) fica visível sem depender de notar a ausência do efeito esperado dias depois — fecha o gap que já causou um incidente documentado.

**Funcionalidades:** US01

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] As 3 rotas de cron existentes registram resultado de execução (sucesso/falha + motivo)
- [ ] Cron que não dispara no horário esperado é distinguível de cron que disparou e falhou

**Aprovador:** Dono do projeto

### Milestone 2: Histórico consolidado no dashboard-ops

**Por que é um marco:** entrega o ponto único de consulta — operador não precisa saber de cor quais crons existem nem abrir a Vercel para diagnosticar; reaproveita o painel do PRD 016 em vez de criar ferramenta nova.

**Funcionalidades:** US02

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Histórico de execução é visível sem acesso a log bruto da Vercel

**Aprovador:** Dono do projeto

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| `/api/coletivas/tick` sem agendamento automático confirmado pode ser um cron "esquecido", não uma feature de visibilidade | Alto se for de fato um gap — regra de negócio da compra coletiva pode depender desse tick rodando periodicamente | Validar com o dono do projeto se o disparo é intencional (outro mecanismo) ou lacuna real, antes ou durante a implementação deste PRD | Pendente |
| Adicionar registro de execução em rota de cron pode introduzir latência ou ponto de falha na própria rota de negócio | Baixo — escrita de log é operação simples, mas deve ser resiliente (falha ao registrar não pode derrubar o cron) | Registro de execução não deve ser bloqueante nem lançar exceção que impeça a ação principal do cron de completar | Pendente |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| PRD 016 (Dashboard de Observabilidade e Operação) | Interna | Milestone 1 em produção (GitHub + Vercel) | Milestone 2 deste PRD (US02) pressupõe o painel `dashboard-ops` existente como local de exibição — sem ele, precisaria de superfície própria |

## 8. Referências

- Skill `dashboard-observabilidade` — documenta o incidente conhecido do `push-metrics` (falha silenciosa por lib que não lança exceção em HTTP de erro)
- `vercel.json` (projeto principal) — cron `carrinho/abandono/tick` registrado
- `dashboard-ops/vercel.json` — cron `push-metrics` registrado
- [PRD 016: Dashboard de Observabilidade e Operação](016-dashboard-observabilidade-operacao.md) — painel onde o histórico de cron (US02) deve ser exibido

## 9. Registro de Decisões

- **2026-08-17:** PRD criado a partir de item de brainstorm ("observabilidade de cron jobs"), motivado por um incidente real já ocorrido (`push-metrics`) e pela ausência total de registro de execução nos 3 crons identificados no código atual. Motivo: falha silenciosa de cron é o tipo de bug mais caro (invisível até o efeito colateral ausente ser notado), e o padrão vale para qualquer cron futuro, não só correção pontual.
- **Critério de dependências:** `depends_on: ["016"]` porque a US02 (histórico consolidado) pressupõe a existência do painel `dashboard-ops` entregue no PRD 016 como superfície de exibição — não é dependência apenas temática.
