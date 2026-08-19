# TRD — industria24.com.br (web)

Documento técnico complementar ao `CLAUDE.md` (que cobre convenção de código
do dia a dia) e aos PRDs (`docs/prds/`, comportamento e regra de negócio). O
TRD registra arquitetura, NFR global e decisões técnicas transversais que não
pertencem a uma feature específica.

## Stack

Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4, Supabase
(`@supabase/ssr`), Sentry, agentes de IA via `@anthropic-ai/sdk` e
`@langchain/langgraph`.

## Arquitetura: monolito modular por domínio

Ver PRD 018 (`docs/prds/018-monolito-modular-por-dominio.md`) para o
comportamento/regra de negócio desta decisão e a OpenSpec change
`openspec/changes/monolito-modular-industria24/` para a spec técnica
completa. Resumo:

- **Eixo de modularização**: domínio de negócio, não camada técnica —
  `catalogo-compra`, `seller`, `afiliado`, `logistica-parceiro`,
  `admin-plataforma`, `pagamentos-financeiro`, mais plataforma compartilhada.
- **Mecanismo de enforcement**: `.github/CODEOWNERS` (path-based) +
  convenção `src/lib/<modulo>/*.ts` com `.test.ts` companheiro.
- **Processo de migração**: strangler fig — todo PR novo já modular, código
  antigo migra sob demanda quando tocado por outro motivo. Sem monorepo real
  (workspaces/pacotes) nesta fase; boundary é só convenção + CODEOWNERS, sem
  enforcement de compilador/lint.
- **Migrations Supabase**: numeração manual sequencial em
  `supabase/migrations/`, com faixa reservada por módulo a partir do momento
  em que mais de um dev estiver commitando migrations simultaneamente (ver
  `arquitetura-migrations-por-modulo/spec.md`). `migrations-lint` no CI
  continua sendo a checagem automática de colisão de prefixo, independente
  das faixas.

## Estado atual (levantamento de 2026-08-19)

- ~38k linhas, 313 arquivos TS/TSX, 120 migrations.
- 122 arquivos em `src/app/` chamam `createClient` do Supabase diretamente —
  parte é leitura simples idiomática de server component, parte mistura
  regra de negócio que deveria estar em `src/lib/<modulo>/`. Proporção exata
  entre os dois casos: **a levantar** (não medido nesta sessão).
- 25 arquivos em `src/lib/*.ts` como regra de negócio nomeada; 6 com
  `.test.ts` companheiro.
- CI: 4 jobs independentes por PR — `secret-scan` (gitleaks), `lint-build`
  (`npm run lint` + `npm run build`), `test` (`npm run test`, Vitest),
  `migrations-lint` (checa duplicidade de prefixo numérico).

## Camadas (dentro de cada módulo de domínio)

| Camada | Local | Responsabilidade |
|---|---|---|
| Apresentação | `src/app/<rotas-do-modulo>/`, `src/components/<modulo>/` | UI, roteamento, orquestração leve |
| Serviço / regra de negócio | `src/lib/<modulo>/*.ts` | Funções puras testáveis, sem acesso direto a UI |
| Dados | `src/lib/supabase/` (compartilhado) | Clients Supabase (browser/server/service-role) |

Nenhum monorepo real (workspaces, boundary de compilador) está em uso — a
separação de camada é convenção de código, reforçada por revisão de PR, não
por ferramenta.

## Volumetria atual (medida em 2026-08-19)

Levantada no Supabase Dashboard (projeto `industria24h`, `tiwdqgyeyvceaiqqwitc`,
plano **Free**) como parte do brainstorm de gatilhos de escala:

| Métrica | Valor |
|---|---|
| Tamanho do banco | 0,037 GB (37 MB) |
| Storage | 0,019 GB (19 MB) |
| Usuários ativos mensais (MAU) | 19 |
| Conexões simultâneas de pico (Realtime) | 3 |
| Cache hit rate (Query Performance) | 100% |
| Linhas médias processadas por chamada | 3,0 |
| Warnings do Performance Advisor | 687 (quase todos "unindexed foreign keys") |

Ver PRD 019 (`docs/prds/019-indices-fk-triagem-e-gatilhos-escala.md`) para a
triagem completa: as FKs de maior `seq_scan` real (`lojas.owner_id`,
`produtos.categoria_id`/`subcategoria_id`, `vendas_futuras.produto_id` etc.)
foram identificadas, mas em tabelas de 18 a ~300 linhas — pequenas demais para
o Postgres preferir índice a sequential scan hoje. A causa da lentidão
percebida no painel admin/seller **não foi confirmada** como sendo falta de
índice; fica como investigação separada (N+1/waterfall é a hipótese mais
provável a checar primeiro).

## Gatilhos de Escala

Critério numérico para decidir **quando** avaliar cada técnica de escala —
não uma decisão de adotar nenhuma delas agora. Nenhum threshold abaixo foi
atingido em 2026-08-19 (ver tabela de volumetria acima). Valores de
referência marcados como premissa, sem histórico de crescimento do
industria24 para calibrar com precisão — revisar quando houver dado real.

| Técnica | Gatilho proposto *(premissa — confirme ou corrija)* | Por que esse número |
|---|---|---|
| Cache de banco (Redis ou similar) | Cache hit rate do Postgres cair abaixo de ~95% de forma sustentada, ou working set > tamanho de RAM do plano Supabase | hoje 100% de cache hit rate no próprio Postgres — cache de aplicação resolveria um problema que ainda não existe |
| Read replica (master/slave) | Banco > ~5-10 GB **ou** carga de leitura consistentemente separável de escrita (ex.: relatórios pesados competindo com checkout) | Supabase só oferece read replica a partir do plano Pro; abaixo disso o custo operacional não se paga |
| Load balancer / arquitetura horizontal dedicada | Só relevante se o projeto sair do Vercel (que já escala serverless horizontalmente por padrão) — ou ao adicionar processamento com estado que o serverless não cobre (ex.: worker de fila de longa duração) | hoje não há componente com estado fora do Supabase que precise de balanceamento próprio |
| Master/slave explícito (fora do modelo gerenciado Supabase) | Só cogitar se sair do Supabase gerenciado — dentro dele, read replica cobre o mesmo caso de uso | evita reconstruir manualmente o que o provedor já oferece gerenciado |

DDD (bounded contexts formais, agregados, camada de domínio explícita) não
tem gatilho de volumetria — é tratado como continuação natural do PRD 018
(monolito modular), avançando conforme o número de devs/módulos crescer, não
conforme volume de dados ou tráfego.

## Fora de escopo desta versão do TRD

- Implementação de qualquer técnica de escala listada acima — só o gatilho
  está documentado, não a adoção.
- Investigação da causa real da lentidão percebida no painel admin/seller —
  registrada como pendente no PRD 019, não resolvida aqui.
