## ADDED Requirements

### Requirement: O estado `'EmAnalise'` existe no banco
A `constraint lojas_situacao_check` DEVE aceitar `'EmAnalise'` além de `'Ativa'` e `'Inativa'`
(hoje a 0033 só permite os dois primeiros, e nenhuma migration jamais gravou `'EmAnalise'`). A
migration DEVE recriar a constraint de forma idempotente (`drop constraint if exists` + `add`).

#### Scenario: Gravar situacao EmAnalise
- **WHEN** um INSERT ou UPDATE define `lojas.situacao = 'EmAnalise'`
- **THEN** o banco aceita o valor (não viola `lojas_situacao_check`)

### Requirement: Loja nova nasce em análise, não ativa
Uma loja criada por um seller (não-admin) DEVE nascer com `situacao = 'EmAnalise'`. O
`column_default` de `lojas.situacao` DEVE passar a ser `'EmAnalise'`. O sistema DEVE impedir, no
banco, que um INSERT não-admin em `public.lojas` crie a loja com `situacao` diferente de
`'EmAnalise'` — via um trigger dedicado `guard_loja_insert_moderacao` (BEFORE INSERT), separado
de `guard_campos_restritos()`, que libera `auth.uid()` nulo (service_role), admin e o bypass
`app.checkout_rpc`. `guard_campos_restritos()` NÃO DEVE ser reescrito por este change (já cobre
o UPDATE de `situacao`).

#### Scenario: Seller cadastra a primeira loja
- **WHEN** um seller autenticado envia o formulário de `/seller/minha-loja` para criar a loja
- **THEN** a loja é gravada com `situacao = 'EmAnalise'`, não aparece na vitrine pública, e a
  Server Action retorna sucesso

#### Scenario: INSERT não-admin tentando nascer Ativa
- **WHEN** um cliente autenticado não-admin tenta inserir em `public.lojas` com `situacao =
  'Ativa'` (ou qualquer valor diferente de `'EmAnalise'`)
- **THEN** o trigger `guard_loja_insert_moderacao` levanta exceção e o INSERT falha

#### Scenario: Lojas Ativas existentes não são afetadas
- **WHEN** a migration é aplicada
- **THEN** lojas que já estão `'Ativa'` permanecem `'Ativa'`; só o comportamento de INSERT e o
  default mudam

### Requirement: Server Action de loja grava o estado inicial explicitamente
`salvarLoja` DEVE, na criação (sem `id` existente), incluir `situacao: 'EmAnalise'` no payload do
insert em vez de depender do default da coluna — defesa em profundidade contra futura regressão
do default.

#### Scenario: Criação de loja pela Server Action
- **WHEN** `salvarLoja` executa o ramo de criação
- **THEN** o payload enviado ao Supabase contém `situacao: 'EmAnalise'` e `owner_id = auth.uid()`

### Requirement: Fila de curadoria de loja reflete o estado real
A fila `/admin/lojas` e o badge da sidebar do admin DEVEM contar lojas com `situacao =
'EmAnalise'`, e esse valor DEVE ser diferente de zero sempre que houver loja aguardando
aprovação (o valor contado e o valor gravado no onboarding DEVEM ser o mesmo literal).

#### Scenario: Uma loja recém-criada
- **WHEN** um seller cria uma loja e um admin abre `/admin`
- **THEN** o badge de `/admin/lojas` mostra pelo menos 1 e a loja aparece na fila

### Requirement: Só o admin muda a situação da loja
Após a criação, a `situacao` de uma loja só PODE ser alterada por um admin. O trigger DEVE
bloquear qualquer UPDATE de `situacao` feito por não-admin.

#### Scenario: Seller tenta ativar a própria loja
- **WHEN** um seller faz UPDATE em `lojas.situacao` de `'EmAnalise'` para `'Ativa'`
- **THEN** o trigger levanta "Apenas admin altera a situação da loja (moderação)."

### Requirement: Curadoria automática de loja segue no fluxo de criação
A criação e a edição de loja DEVEM continuar disparando `disparaCuradoriaLoja(lojaId)` em
`after()`, sem bloquear a resposta ao seller. A curadoria é agnóstica a `situacao` (confirmado:
`curadoria-orquestrador.ts` e `curadoria-regras.ts` não referenciam o campo), então a mudança de
default para `'EmAnalise'` NÃO exige alteração nesses arquivos. Condicionar a curadoria a
`situacao = 'EmAnalise'` (evitar reprocessar loja `Ativa` a cada edição trivial) é comportamento
novo, fora do escopo deste change.

#### Scenario: Loja criada com dados incompletos
- **WHEN** `salvarLoja` cria a loja
- **THEN** a curadoria é disparada assincronamente e os avisos ficam visíveis em
  `/seller/minha-loja` sem impedir o cadastro
