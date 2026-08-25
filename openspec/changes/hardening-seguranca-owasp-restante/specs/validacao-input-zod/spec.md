## ADDED Requirements

### Requirement: Server Actions que tocam dinheiro validam input com zod
As Server Actions `src/app/checkout/actions.ts`, `src/app/coletiva/actions.ts` e
`src/app/leilao/actions.ts` DEVEM validar seu payload de entrada contra um schema `zod` dedicado
(`src/lib/checkout/schemas.ts`, `src/lib/coletiva/schemas.ts`, `src/lib/leilao/schemas.ts`) antes
de tocar em Supabase/RPC, retornando erro de validação claro em vez de deixar o erro do Postgres
estourar.

#### Scenario: Payload de checkout com campo obrigatório ausente
- **WHEN** `checkout/actions.ts` recebe um payload sem `cep` ou com `valor` não numérico
- **THEN** a Server Action retorna um erro de validação do zod antes de qualquer chamada ao
  Supabase, sem inserir dado inválido

### Requirement: Migração incremental do resto do projeto
Arquivos fora de `checkout/`, `coletiva/` e `leilao/` NÃO precisam ganhar validação zod neste
change; migram por strangler fig quando tocados por outro motivo (bug ou feature).

#### Scenario: PR futuro altera uma Server Action sem validação zod
- **WHEN** um PR não relacionado a este change modifica uma Server Action existente sem schema zod
- **THEN** adicionar o schema correspondente é bem-vindo nesse PR, mas não é bloqueante
