---
prd_number: "016"
status: rascunho
priority: média
created: 2026-08-17
issue: ""
depends_on: []
references:
  - "https://industria24h-ops-dashboard.vercel.app" # dashboard em produção
  - ".claude/skills/dashboard-observabilidade/SKILL.md" # conhecimento operacional detalhado
---

# PRD 016: Dashboard de Observabilidade e Operação

## 1. Contexto

- **Produto/área**: ferramenta interna de operação do time do Industria24h — não é o site industria24.com.br, é um painel à parte para acompanhar a saúde do projeto.
- **Estado atual**: antes deste painel, saber o status de issues abertas, PRs pendentes de review, rate limit do token do GitHub, deployments recentes na Vercel e erros em produção exigia abrir 3 ferramentas separadas (GitHub, Vercel, Sentry) manualmente. Não havia visão consolidada nem histórico de tendência — cada fonte só mostra o snapshot atual dela. Parte da funcionalidade já está implementada e no ar, documentada na skill `dashboard-observabilidade` — este PRD formaliza esse trabalho retroativamente.
- **Problema**: quem opera o projeto (dono, agentes de IA em sessões futuras) perde tempo alternando entre ferramentas para responder "está tudo bem no projeto agora?", e não existe alerta nem tendência histórica — só o estado atual de cada fonte, isoladamente.

> **Contexto técnico** (Next.js, Vercel, integrações) vive no TRD/skill `dashboard-observabilidade`; aqui cobre-se comportamento e regra de produto.

## 2. Solução Proposta

### Visão de produto

- Um painel único, acessível por link, que consolida o estado operacional do projeto: issues, PRs, rate limit (GitHub), deployments e latência de build (Vercel), erros e performance (Sentry).
- Dado sempre ao vivo (polling), sem depender de o usuário lembrar de checar cada ferramenta.
- Camada de visualização histórica (Grafana) e de série temporal (Prometheus) para responder não só "como está agora" mas "como estava evoluindo".
- Painel de operação interna, não voltado ao cliente final do marketplace — sem branding do produto, foco em densidade de informação.

### Decisões de produto

1. **Sem autenticação por senha** — o painel expõe issues/PRs/erros para quem tiver o link, decisão tomada a pedido do usuário priorizando conveniência de acesso sobre confidencialidade. Confirmada como decisão vigente; o risco de exposição segue registrado em §7 para reavaliação futura, não como pendência deste PRD.
2. **Latência reportada é build duration, não latência de request em runtime** — medir p50/p95 de request real exigiria plano pago da Vercel (Web Analytics/Speed Insights) ainda não confirmado como disponível; build duration foi aceito como proxy.
3. **Cron de atualização de série temporal limitado a 1x/dia** — restrição do plano Hobby da Vercel; aceito como suficiente para tendência de médio prazo, não para alertar sobre picos de curto prazo.

### Fora do escopo

- Alertas automáticos (push, e-mail, Slack) quando uma métrica sai do normal — não implementado nem pedido até o momento.
- Autenticação/controle de acesso ao painel — decisão de produto vigente é acesso livre por link (ver decisão 1).
- Métricas de negócio do marketplace (vendas, GMV, conversão) — este painel é operação técnica, não BI de produto.
- Substituir o uso direto do GitHub/Vercel/Sentry para ações (fechar issue, aprovar deploy, resolver erro) — o painel é só leitura/visualização.

## 3. Funcionalidades

### US01: Visualizar status do GitHub

Como operador do projeto, quero ver issues abertas, status de PR/review e rate limit do token num só lugar, para saber o estado do repositório sem abrir o GitHub.

**Rules:**
- Dado vem da API REST do GitHub (`api.github.com`), repositório `Schneider-Gr/industria24hIA`.
- Cobre: issues abertas, PRs com status de review (`/pulls/{n}/reviews`), rate limit do token (`/rate_limit`).
- Atualização por polling automático de 30s, sem ação manual do usuário — mesmo intervalo das outras duas fontes.

**Edge cases:**
- Token do GitHub sem permissão ou expirado → painel exibe erro de autenticação de forma visível, não falha silenciosamente.
- Rate limit do token esgotado → painel sinaliza o esgotamento e o horário de reset, em vez de simplesmente não atualizar.

### US02: Visualizar status da Vercel

Como operador do projeto, quero ver os últimos deployments e a latência de build do projeto principal, para saber se o deploy mais recente foi saudável.

**Rules:**
- Dado vem da API REST v6 da Vercel, deployments do projeto **principal** (`industria24h`), não do projeto do próprio dashboard.
- Latência exibida é build duration (p50/p95), não latência de request em runtime (ver Decisão de produto 2).
- Atualização por polling automático de 30s.

**Edge cases:**
- Token/projeto/team ID da Vercel mal configurado → painel exibe erro específico de configuração, distinguível de "sem deployments recentes".
- Build falhou no deployment mais recente → painel destaca visualmente o deployment com falha, não trata como deployment normal na lista.

### US03: Visualizar status do Sentry

Como operador do projeto, quero ver issues não resolvidas e a performance (p50/p95 de duração de transação) do site principal, para saber se há erros ativos em produção.

**Rules:**
- Consome a API do Sentry (`sentry.io/api/0`), organização e projeto configuráveis via `SENTRY_ORG`/`SENTRY_PROJECT`.
- Painel só **consome** dados do Sentry — a instrumentação de captura de erro já existe no site principal e não é escopo deste PRD.
- Se o plano do Sentry não incluir Performance/Tracing, o painel degrada mostrando só as issues, sem quebrar a página inteira.

**Edge cases:**
- Token do Sentry ausente/inválido → painel de Sentry mostra estado de "integração pendente", sem quebrar os demais painéis (GitHub/Vercel continuam funcionando).
- Performance/Tracing desabilitado no plano → p50/p95 fica ausente, mas issues não resolvidas continuam visíveis.

### US04: Visualizar painel consolidado no Grafana

Como operador do projeto, quero um dashboard visual único que junte as 3 fontes (GitHub, Vercel, Sentry), para ter uma visão consolidada sem depender só da página do dashboard-ops.

**Rules:**
- Grafana consome diretamente os endpoints JSON já expostos pelo dashboard-ops (`/api/github`, `/api/vercel`, `/api/sentry`), sem duplicar lógica de parsing.
- Dashboard tem UID fixo, para permitir reprovisionamento sem duplicar painéis.

**Edge cases:**
- Endpoint do dashboard-ops fora do ar → painel do Grafana correspondente mostra "sem dados", não erro que quebra o dashboard inteiro.

### US05: Acompanhar tendência histórica via Prometheus

Como operador do projeto, quero ver a evolução das métricas ao longo do tempo (não só o snapshot atual), para identificar tendências de degradação antes que virem incidente.

**Rules:**
- Métricas dos 3 endpoints são empurradas para o Prometheus hospedado (Grafana Cloud) via `remote_write`, com frequência definida por cron.
- Frequência do cron limitada a 1x/dia no plano atual (ver Decisão de produto 3) — não é substituto de alerta em tempo real.
- Falha no envio (ex.: autenticação) deve ser registrada como erro, não descartada silenciosamente (a lib usada não lança exceção em falha HTTP, o código precisa checar o status da resposta explicitamente).

**Edge cases:**
- Cron falha em executar (erro de autenticação, endpoint fora do ar) → falha fica registrada/visível para o operador, não passa despercebida como "sucesso silencioso".
- Sem dados de um dia (cron não rodou) → gráfico de tendência mostra a lacuna, não interpola ou inventa valor.

## 4. Fluxo de Negócio

_Não aplicável — a feature não tem ramificação de regra de negócio complexa; é consolidação e exibição de dados de leitura, coberta pelos edge cases de cada US._

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| Painel principal (dashboard-ops) responde e exibe as 3 fontes (GitHub, Vercel, Sentry) sem exigir login | operador precisa checar o estado do projeto rapidamente, sem fricção de autenticação | acessar a URL de produção e confirmar que os 3 cards carregam dado real |
| Falha em uma fonte não derruba as demais | operador não pode perder visibilidade de GitHub/Vercel só porque o Sentry está com token pendente | derrubar/invalidar uma integração isoladamente e confirmar que as outras 2 continuam funcionando |
| Painel do Grafana reflete os mesmos dados dos endpoints do dashboard-ops | consolidação visual só tem valor se os dados baterem com a fonte | comparar valor exibido no Grafana com o retorno direto do endpoint JSON |
| Push de métricas para o Prometheus roda e falha de forma visível quando falha | sem isso, uma falha de autenticação no cron passa despercebida indefinidamente (já ocorreu — ver skill) | forçar uma falha de credencial e confirmar que fica registrada, não silenciosa |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| Painéis GitHub e Vercel com dado real | Já em produção (skill `dashboard-observabilidade`) | Manter 100% funcional | Contínuo | Sem regressão por 30 dias | Dono do projeto |
| Painel Sentry com dado real | Hoje pendente (token não configurado) | Token configurado e painel funcional | A levantar | Painel exibe issues não resolvidas | Dono do projeto |
| Cron de push-metrics executando sem erro | A levantar — não medido até hoje | 100% das execuções diárias sem erro de autenticação | A levantar | Falha registrada e visível quando ocorrer | Dono do projeto |

## 6. Milestones

### Milestone 1: Painel operacional ao vivo (GitHub + Vercel)

**Por que é um marco:** primeira vez que o operador consegue ver o estado real do repositório e do deploy num único lugar, sem abrir GitHub e Vercel manualmente. **Já entregue e em produção.**

**Funcionalidades:** US01, US02

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [x] Painel principal responde e exibe as 3 fontes... *(GitHub e Vercel; Sentry cobre Milestone 2)* — GitHub e Vercel confirmados funcionais em produção conforme skill

**Aprovador:** Dono do projeto

### Milestone 2: Visibilidade de erros de produção (Sentry)

**Por que é um marco:** fecha o gap de não saber se há erro ativo em produção sem abrir o Sentry separadamente — completa a trinca de fontes do painel principal.

**Funcionalidades:** US03

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Painel Sentry com dado real, token configurado
- [ ] Falha em uma fonte não derruba as demais

**Aprovador:** Dono do projeto

### Milestone 3: Visão consolidada (Grafana)

**Por que é um marco:** entrega um dashboard visual único, fora da página do dashboard-ops, reaproveitando o trabalho de parsing já feito — reduz a necessidade de abrir o painel próprio para ter visão geral.

**Funcionalidades:** US04

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Painel do Grafana reflete os mesmos dados dos endpoints do dashboard-ops

**Aprovador:** Dono do projeto

### Milestone 4: Tendência histórica (Prometheus)

**Por que é um marco:** primeira vez que o operador enxerga evolução ao longo do tempo, não só o snapshot do momento — habilita detectar degradação gradual antes de virar incidente.

**Funcionalidades:** US05

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Push de métricas para o Prometheus roda e falha de forma visível quando falha

**Aprovador:** Dono do projeto

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| Painel sem autenticação expõe issues/PRs/erros publicamente para quem tem o link | Médio — vazamento de informação operacional (não financeira) | Reavaliar decisão de acesso livre; considerar autenticação simples se a exposição incomodar | Monitorando |
| Cron de push-metrics limitado a 1x/dia (plano Hobby) | Baixo — reduz a granularidade da tendência, não impede o marco | Aceito como suficiente por ora; upgrade de plano se granularidade virar bloqueio | Mitigado (aceito) |
| Env vars "Sensitive" da Vercel não decriptam via CLI, dificultando diagnóstico | Baixo — já mapeado e contornável (rota de diagnóstico temporária) | Procedimento documentado na skill `dashboard-observabilidade` | Mitigado |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| Token `SENTRY_AUTH_TOKEN` gerado manualmente em sentry.io (org `schneider-g5`) | Externa (ação humana) | Pendente | Bloqueia Milestone 2 |

## 8. Referências

- [Dashboard em produção](https://industria24h-ops-dashboard.vercel.app) — instância ao vivo do painel principal
- [Skill dashboard-observabilidade](../../.claude/skills/dashboard-observabilidade/SKILL.md) — conhecimento operacional técnico detalhado, armadilhas já resolvidas (env vars, Turbopack, remote_write)
- Memória de sessão 14/08 (`industria24h-dashboard-ops-2026-08-14.md`) — registro do momento em que o painel foi construído; vive fora deste repositório, em `~/.claude/projects/.../memory/`, sem link direto

## 9. Registro de Decisões

- **2026-08-17:** PRD criado retroativamente a partir de trabalho já implementado, documentado na skill `dashboard-observabilidade`. Motivo: o painel existia em produção sem PRD formal; este documento formaliza comportamento e regra de negócio para dar rastreabilidade a partir de agora.
- **Critério de dependências:** `depends_on: []` porque nenhum PRD existente em `docs/prds/` documenta comportamento, entidade ou regra da qual esta feature dependa — é uma ferramenta interna de operação, desacoplada do domínio de negócio do marketplace.
- **2026-08-17:** Todas as premissas do draft inicial confirmadas pelo dono do projeto sem alteração de conteúdo — inclui a decisão de manter o painel sem autenticação (risco mantido em §7 para reavaliação futura, não bloqueante).
