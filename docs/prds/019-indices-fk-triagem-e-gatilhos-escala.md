---
prd_number: "019"
status: rascunho
priority: média
created: 2026-08-19
issue: "#326"
depends_on: []
references:
  - "https://supabase.com/dashboard/project/tiwdqgyeyvceaiqqwitc/advisors/performance"
  - "docs/trd.md"
---

# PRD 019: Triagem de Índices de FK e Gatilhos de Escala

## 1. Contexto

- **Produto/área**: infraestrutura de dados do industria24.com.br — painéis
  internos (admin, seller) e planejamento de capacidade.
- **Estado atual**: o Supabase Performance Advisor aponta 687 warnings de
  "unindexed foreign keys". O usuário relatou lentidão percebida no painel
  admin/seller em telas com muito JOIN. Investigação nesta sessão (brainstorm
  de 2026-08-19) cruzou as FKs sem índice com uso real (`pg_stat_user_tables`)
  e encontrou hot paths concretos: `lojas.owner_id` (543.992 seq scans sobre
  só 18 linhas), `produtos.categoria_id`/`subcategoria_id` (68.178 seq scans
  sobre 206 linhas), `vendas_futuras.produto_id` (64.910 seq scans sobre 28
  linhas), entre outros.
- **Problema**: **achado que contraria a causa assumida** — nas tabelas
  medidas, o volume de linhas (18 a ~300) é pequeno demais para o Postgres
  preferir um índice a uma sequential scan; a ausência de índice não deve ser
  hoje a causa dominante da lentidão sentida no painel. O grande número de
  `seq_scan` é sintoma de **frequência de chamada** (endpoint muito usado),
  não de tamanho de tabela. A causa mais provável da lentidão percebida é
  outra (padrão N+1 de queries, waterfall de chamadas sequenciais no
  client, ou overhead de setup por requisição) e **não foi identificada
  nesta sessão** — fica registrada como investigação separada, fora do
  escopo deste PRD.

> Esse é um ponto de divergência explícita entre a hipótese inicial do
> usuário ("painel lento por causa de JOIN sem índice") e o que a telemetria
> mostrou. Registrado aqui em vez de "corrigir" silenciosamente o que a
> medição não confirma como causa.

> **Contexto técnico** (números de plano Supabase, queries de triagem) vive
> no TRD (`docs/trd.md`), que ganha uma seção nova de "Gatilhos de Escala"
> como parte desta mudança.

## 2. Solução Proposta

### Visão de produto

- Indexar, mesmo assim, as FKs de maior `seq_scan` como higiene de baixo
  custo e risco — elas crescem com o produto, e o índice não piora nada hoje.
- Não indexar as 687 FKs em massa — só as que a triagem mostrou como
  realmente acessadas, evitando índice sem benefício em tabela de escrita
  frequente.
- Abrir investigação separada (não implementar aqui) sobre a causa real da
  lentidão percebida no painel admin/seller — N+1/waterfall é a hipótese mais
  provável a checar primeiro.
- Documentar **gatilhos de escala** (thresholds numéricos) para load
  balancer horizontal, read replica, cache de banco e master/slave — sem
  implementar nenhum deles agora, já que o volume atual (19 MAU, banco de
  37MB) está ordens de grandeza abaixo do ponto em que qualquer um desses
  se paga.

### Decisões de produto

1. **Triagem antes de indexação em massa** — só as FKs com uso real medido
   entram nesta rodada; as demais ficam registradas para reavaliar quando o
   produto crescer.
2. **Causa real da lentidão não confirmada** — este PRD não afirma ter
   resolvido a lentidão do painel; a indexação é higiene preventiva, não a
   correção do sintoma relatado. *(decisão de transparência, não de
   otimização — evita reportar "resolvido" sem prova)*
3. **Gatilhos de escala como documento, não implementação** — decisão
   explícita do dono do produto de não investir em infra de escala sem uso
   real que justifique, mas de já ter o critério de quando investir.

> Nenhuma decisão arquitetural durável é tomada aqui (não se escolhe
> tecnologia de cache, réplica ou balanceador) — os gatilhos definem *quando*
> decidir, não *o quê* adotar. Quando um gatilho disparar, a escolha
> específica de tecnologia vira ADR via `escrever-trd` Modo Decision.

### Fora do escopo

- **Investigação da causa real da lentidão do painel** (N+1, waterfall,
  overhead de conexão) — fica como item separado a investigar, não faz parte
  deste PRD.
- **Indexação das 687 FKs em massa** — só as priorizadas pela triagem.
- **Implementação de qualquer técnica de escala** (load balancer, réplica,
  cache, master/slave) — só o documento de gatilhos.
- **Migração para plano Supabase Pro** — decisão de custo separada, só
  necessária quando um gatilho de fato disparar.

## 3. Funcionalidades

### US01: Índices em FKs de alto uso real

Como operador da plataforma, quero que as foreign keys mais acessadas
tenham índice, para que consultas com JOIN nessas colunas não piorem à
medida que as tabelas crescem.

**Rules:**
- Prioridade: `lojas.owner_id`, `produtos.categoria_id`,
  `produtos.subcategoria_id`, `vendas_futuras.produto_id`,
  `compras_coletivas.criador_id`/`regra_id`/`loja_id`, `pedidos.cliente_id`,
  `afiliacoes.produto_id`, `conversas.pedido_id`/`loja_id`/`produto_id` — as
  12 FKs com `seq_scan` mais alto, confirmadas em duas medições (triagem
  inicial e reconfirmação na implementação).
- **Decisão técnica na implementação**: `CREATE INDEX IF NOT EXISTS` simples,
  não `CONCURRENTLY` — as 7 tabelas têm 4 a 306 linhas, lock de milissegundos,
  e isso permite testar em `begin; ... rollback;` (que `CONCURRENTLY` não
  permite, por não rodar em transação). Ver `openspec/changes/monolito-modular-industria24/tasks.md`.
- Testado em `begin; ... rollback;` antes de aplicar em produção, seguindo a
  regra já vigente do projeto para DDL em tabela com dado real. ✅ feito.

**Edge cases:**
- Índice criado não reduz `seq_scan` observável em tabela pequena (Postgres
  planner ainda prefere seq scan por custo) → esperado e aceitável; o
  ganho aparece quando a tabela crescer, não imediatamente. *(premissa —
  confirme ou corrija)*
- Tabela de escrita muito frequente (ex.: `auditoria_eventos`) tem FK de
  baixo uso de leitura → não indexar nesta rodada, mesmo que apareça na
  lista de 687, para não piorar `INSERT`. *(premissa — confirme ou corrija)*

### US02: Documento de gatilhos de escala

Como responsável técnico do produto, quero um critério numérico registrado
para decidir quando adotar load balancer horizontal, read replica, cache de
banco ou master/slave, para não implementar infra de escala antes de haver
uso real que a justifique, nem ser pego de surpresa quando o crescimento vier.

**Rules:**
- Cada técnica tem pelo menos um gatilho numérico (MAU, tamanho de banco,
  conexões simultâneas de pico, ou taxa de cache miss) documentado em
  `docs/trd.md`, seção "Gatilhos de Escala".
- Valores de referência de mercado/Supabase entram marcados como premissa,
  já que não há histórico de crescimento do industria24 para calibrar com
  precisão. *(premissa — confirme ou corrija ao revisar o TRD)*
- DDD (bounded contexts formais, agregados) é tratado como continuação do
  PRD 018, não repetido aqui.

**Edge cases:**
- Um gatilho dispara (ex.: banco ultrapassa X GB) → o documento não
  implementa a técnica automaticamente; só sinaliza que a decisão de adotar
  entra em pauta, com plano Supabase e ADR de tecnologia a definir naquele
  momento. *(premissa — confirme ou corrija)*
- Crescimento de MAU sem crescimento proporcional de banco (ou vice-versa) →
  gatilhos são avaliados independentemente, não como pacote único — cada
  técnica resolve um tipo de gargalo diferente. *(premissa — confirme ou
  corrija)*

## 4. Fluxo de Negócio

Não aplicável — não há ramificação de jornada de usuário final nesta feature.

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| Índices das FKs priorizadas criados em produção sem lock perceptível | tabelas de 4-306 linhas: `CREATE INDEX` simples trava por milissegundos, sem indisponibilidade real | confirmado via `pg_indexes` pós-aplicação — os 12 índices existem no schema |
| Documento de gatilhos de escala existe em `docs/trd.md` cobrindo as 4 técnicas | é o critério que evita decisão de infra sem base numérica | ler a seção "Gatilhos de Escala" do TRD e conferir que cada técnica tem threshold registrado |
| Investigação da causa real da lentidão do painel aberta como item separado | evita fechar este PRD com a falsa impressão de que a lentidão foi resolvida | existência de registro (Issue ou item de backlog) referenciando este PRD como origem |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| `seq_scan` nas FKs priorizadas | valores medidos nesta sessão via `pg_stat_user_tables` (2026-08-19) — ex.: `lojas.owner_id` 543.992 | monitorar tendência, sem meta de redução (índice não elimina a chamada, só barateia o acesso quando a tabela crescer) | Contínuo | — | dono do repositório |
| Tempo de resposta percebido do painel admin/seller | **A levantar** — não medido nesta sessão (não há instrumentação de latência de painel hoje) | definir após a investigação de causa real (fora de escopo deste PRD) | A definir junto da investigação | A definir | dono do repositório |

## 6. Milestones

### Milestone 1: Índices de FK aplicados

**Por que é um marco:** fecha a ação de baixo custo/risco identificada nesta
sessão, sem esperar a investigação mais profunda da causa real de lentidão.

**Funcionalidades:** US01

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Índices das FKs priorizadas criados (`CREATE INDEX IF NOT EXISTS`), testados em `begin; ... rollback;` antes de aplicar — migration `0132_indices_fk_alta_frequencia.sql`, PR a referenciar
- [ ] Migration numerada sem colisão de prefixo (`migrations-lint` verde)

**Aprovador:** dono do repositório (industria24hs-creator)

### Milestone 2: Gatilhos de escala documentados

**Por que é um marco:** entrega um critério de decisão reutilizável para as
4 técnicas de infra levantadas, sem gastar esforço de implementação antes da
hora.

**Funcionalidades:** US02

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Seção "Gatilhos de Escala" publicada em `docs/trd.md`
- [ ] Cada uma das 4 técnicas (load balancer, read replica, cache, master/slave) com threshold numérico registrado

**Aprovador:** dono do repositório (industria24hs-creator)

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| Índices criados não resolvem a lentidão percebida (causa real é outra) | Médio | comunicado explicitamente neste PRD como higiene, não como fix do sintoma; investigação separada aberta | Mitigado (expectativa alinhada) |
| Gatilhos de escala com thresholds mal calibrados (sem histórico real de crescimento) | Baixo | marcados como premissa no TRD, revisáveis quando houver dado de crescimento real | Monitorando |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| Investigação de causa real da lentidão do painel (N+1/waterfall) | Interna, item futuro | Pendente, não iniciado | Milestone 1 e 2 deste PRD seguem entregáveis sem ela; só a resolução do sintoma relatado pelo usuário fica pendente |

## 8. Referências

- [Supabase Performance Advisor — projeto industria24h](https://supabase.com/dashboard/project/tiwdqgyeyvceaiqqwitc/advisors/performance) — origem dos 687 warnings de FK sem índice
- `docs/trd.md` — recebe a seção "Gatilhos de Escala" desta mudança
- PRD 018 (`018-monolito-modular-por-dominio.md`) — DDD tratado como continuação dele, não repetido aqui

## 9. Registro de Decisões

- **2026-08-19:** Não indexar as 687 FKs em massa — só as priorizadas por uso
  real medido via `pg_stat_user_tables`. Motivo: evitar índice sem benefício
  em tabela de escrita frequente, e focar esforço onde há evidência de
  chamada real.
- **2026-08-19:** Registrado explicitamente que a hipótese inicial ("painel
  lento por FK sem índice") não foi confirmada pela telemetria — tamanho das
  tabelas medidas (18 a ~300 linhas) é pequeno demais para o Postgres
  preferir índice a seq scan. Motivo: transparência sobre o que foi de fato
  resolvido versus o que continua como investigação em aberto.
- **2026-08-19:** Load balancer horizontal, read replica, cache de banco e
  master/slave não entram como implementação agora — só como documento de
  gatilhos numéricos. Motivo: volume atual (19 MAU, banco de 37MB, 100% cache
  hit rate no Postgres) está ordens de grandeza abaixo do ponto em que
  qualquer uma dessas técnicas se paga; decisão do dono do produto após
  apresentação dos números reais nesta sessão.
- **2026-08-19:** DDD tratado como continuação do PRD 018 (os 6 módulos de
  domínio já são o primeiro degrau de bounded contexts), não como frente
  nova. Motivo: confirmado explicitamente pelo dono do produto nesta sessão.
