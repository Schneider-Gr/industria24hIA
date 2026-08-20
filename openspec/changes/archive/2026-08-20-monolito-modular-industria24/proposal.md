## Why

O industria24.com.br vai ganhar 2 devs além do dono atual. Hoje o repositório é
organizado só por rota do App Router (`(admin)`, `(seller)`, `(afiliado)`,
`(parceiro)` + rotas públicas soltas), sem separação por domínio de negócio nem
por camada técnica, e sem `CODEOWNERS`. 122 arquivos em `src/app/` acessam o
Supabase diretamente, misturando em parte leitura simples idiomática e em parte
regra de negócio que deveria estar isolada e testável em `src/lib/*.ts` — só 25
arquivos vivem lá hoje, e apenas 6 têm teste companheiro apesar do TDD ser
obrigatório para código novo segundo o `CLAUDE.md`. Numeração manual de
`supabase/migrations/` já colidiu 3 vezes entre sessões/devs concorrentes. Sem
perímetro de dono claro por pasta, dois devs novos tendem a colidir em PRs e em
migrations desde a primeira semana.

## What Changes

- Modularização do repositório por 6 domínios de negócio (não por camada
  técnica): `catalogo-compra`, `seller`, `afiliado`, `logistica-parceiro`,
  `admin-plataforma`, `pagamentos-financeiro`, mais um bloco de plataforma
  compartilhada.
- `.github/CODEOWNERS` mapeado pelos mesmos 6 domínios — **já entregue**
  (PR #323), com todos os paths apontando hoje para a mesma conta GitHub
  enquanto os 2 devs novos não têm conta própria.
- Convenção de migração incremental (strangler fig, não big-bang): todo PR novo
  que introduz regra de negócio a implementa em `src/lib/<modulo>/*.ts` com
  `.test.ts` companheiro; código antigo só migra quando tocado por outro
  motivo.
- Faixa de numeração de `supabase/migrations/` reservada por módulo/dono, para
  reduzir a colisão de prefixo já ocorrida 3 vezes.

## Capabilities

### New Capabilities
- `arquitetura-modularizacao-dominio`: convenção de onde regra de negócio nova
  deve viver (`src/lib/<modulo>/`) e o processo de migração incremental do
  código pré-existente.
- `arquitetura-codeowners-dominio`: mapeamento de dono por módulo de domínio em
  `.github/CODEOWNERS`, incluindo o comportamento esperado enquanto os devs
  dividem uma única conta GitHub.
- `arquitetura-migrations-por-modulo`: faixa de numeração de migration
  reservada por módulo, para prevenir colisão entre devs/sessões concorrentes.

### Modified Capabilities
_Nenhuma — as capabilities de domínio existentes em `openspec/specs/` (ex.:
`seller-credito`, `admin-disputas`) descrevem comportamento de produto; esta
change é sobre convenção de engenharia (onde o código vive e quem revisa), não
altera requisito de comportamento de negócio já especificado nelas._

## Impact

- **Código afetado**: `.github/CODEOWNERS` (já alterado, PR #323),
  `src/app/**` (122 arquivos hoje com `createClient` direto, migração
  incremental), `src/lib/**` (novos subdiretórios `src/lib/<modulo>/`),
  `supabase/migrations/`, `CLAUDE.md` (documentação da convenção).
- **PRD relacionado**: PRD 018 (Monolito Modular por Domínio) documenta o
  comportamento/regra de negócio desta mudança de engenharia — este change
  cobre a especificação técnica/spec-driven complementar.
- **Dependências externas**: nenhuma — é reorganização interna de convenção,
  sem nova lib ou serviço.
- **Risco**: baixo tecnicamente (não altera comportamento de produto), mas o
  valor de `arquitetura-codeowners-dominio` como gate de review real fica
  limitado enquanto os 2 devs dividirem uma única conta GitHub — risco de
  produto/processo, não de código, registrado explicitamente na spec.
