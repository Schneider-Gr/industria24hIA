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

## Fora de escopo desta versão do TRD

- Volumetria de requisições, arquitetura horizontal com load balancer,
  replicação de banco (master/slave), camada de cache dedicada e uma
  possível adoção mais formal de Domain-Driven Design são necessidades
  futuras de escala levantadas pelo dono do produto em 2026-08-19, ainda em
  brainstorm — não fazem parte da arquitetura atual documentada aqui.
  Quando maturadas, entram como uma seção nova deste TRD (ou um TRD
  dedicado a infraestrutura/escala), não como reescrita da seção acima.
