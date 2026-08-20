## Purpose

Garantir que regra de negócio nova pare de nascer misturada dentro de
`page.tsx`/`route.ts` e passe a viver em `src/lib/<modulo>/` com teste
companheiro, migrando o código pré-existente de forma incremental sem exigir
uma reestruturação total do repositório.

## ADDED Requirements

### Requirement: Regra de negócio nova em módulo de domínio testável
O sistema SHALL exigir que todo PR que introduza regra de negócio nova (preço,
comissão, repasse, disputa, frete ou equivalente) implemente essa lógica em
`src/lib/<modulo>/*.ts`, onde `<modulo>` é um dos 6 módulos de domínio
(`catalogo-compra`, `seller`, `afiliado`, `logistica-parceiro`,
`admin-plataforma`, `pagamentos-financeiro`) ou o bloco de plataforma
compartilhada.

#### Scenario: PR introduz nova regra de comissão
- **WHEN** um PR adiciona lógica de cálculo de comissão de afiliado
- **THEN** a lógica é implementada em `src/lib/afiliado/*.ts`, não diretamente
  em `src/app/(afiliado)/**/page.tsx` ou `route.ts`

#### Scenario: PR mistura módulos diferentes
- **WHEN** um PR precisa tocar lógica de negócio de mais de um módulo de
  domínio (ex.: `seller` e `afiliado`)
- **THEN** a revisão sinaliza que múltiplos donos precisam revisar, e o PR é
  dividido em PRs menores quando viável

### Requirement: Teste companheiro obrigatório para regra de negócio nova
O sistema SHALL exigir que toda função nova em `src/lib/<modulo>/*.ts` que
carregue regra de negócio nasça com um `.test.ts` companheiro, seguindo o
ciclo Red-Green-Refactor já descrito no `CLAUDE.md` do projeto.

#### Scenario: Função de regra de negócio sem teste
- **WHEN** um PR adiciona uma função de regra de negócio em
  `src/lib/<modulo>/*.ts` sem `.test.ts` companheiro
- **THEN** o CI (`npm run test`) não cobre a função nova, e a revisão humana
  bloqueia o merge até o teste existir

### Requirement: Migração incremental sem retrofit forçado
O sistema SHALL migrar lógica de negócio pré-existente de `src/app/` para
`src/lib/<modulo>/` apenas quando um PR toca aquele arquivo por outro motivo
(bug ou feature nova), nunca como projeto de retrofit total com prazo.

#### Scenario: PR de bug fix toca arquivo com lógica misturada
- **WHEN** um PR corrige um bug em um `page.tsx` que hoje mistura query
  Supabase com regra de negócio
- **THEN** o PR extrai a regra de negócio tocada para `src/lib/<modulo>/`
  como parte da correção, com teste de paridade de comportamento antes de
  mover

#### Scenario: Arquivo com lógica misturada não é tocado
- **WHEN** um arquivo em `src/app/` mistura query e regra de negócio, mas
  nenhum PR o toca por outro motivo
- **THEN** o arquivo permanece como está — não há obrigação de migração
  proativa sem gatilho

### Requirement: Plataforma compartilhada exige revisão adicional
O sistema SHALL exigir revisão de quem já é dono da plataforma compartilhada
(`src/lib/supabase/`, `src/lib/auth*.ts`, `src/lib/rate-limit.ts`,
`supabase/migrations/`, `.github/`, configs de raiz) sempre que um PR de
qualquer módulo de domínio alterar esses caminhos.

#### Scenario: PR de módulo de domínio altera arquivo de plataforma compartilhada
- **WHEN** um PR do módulo `seller` precisa alterar
  `src/lib/supabase/server.ts`
- **THEN** a revisão bloqueia até o dono da plataforma compartilhada aprovar,
  independente do dono do módulo `seller`
