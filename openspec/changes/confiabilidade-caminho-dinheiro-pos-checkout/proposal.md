## Why

Auditoria do caminho do dinheiro (27/08/2026) encontrou cinco falhas concentradas num único trecho do fluxo: da confirmação de pagamento até o repasse ao seller. O tema comum é que cada passo desse trecho ou executa em dobro quando é reexecutado, ou não fecha a venda quando deveria. Os pontos de reentrada são reais e rotineiros: o webhook Asaas e o botão "Verificar pagamento" convergem na mesma função, e o endpoint público do entregador (migration 0112) dispara o recálculo de repasse a cada chamada.

Achados:

1. **Repasse ao seller pode ser pago em dobro.** `repasses` tem `unique (pedido_id, destino, afiliado_id)`; para `destino='seller'` o `afiliado_id` é NULL e no Postgres NULLs são distintos num índice unique, então a constraint não restringe linhas de seller. O `on conflict` em `repasses_recalcular_pedido` (0111) nunca dispara para seller, e uma segunda execução da confirmação insere uma segunda linha `pendente`, que `dispararRepasseAutomaticoComCliente` transfere via PIX de novo.

2. **`transferirRepasse` não reivindica a linha antes de transferir.** `createPixTransfer` roda com a linha ainda `pendente`; o `update status='transferido'` vem depois. Falha de rede entre os dois, ou duas execuções concorrentes, reenviam o PIX.

3. **Frete "tabela da transportadora" (PR #441) não fecha o pedido.** A rota `cotar-frete` devolve o preço da tabela carregando o UUID da transportadora `fonte='tabela_importada'`, o client reenvia esse `transportadora_id`, e `checkout_criar_pedido` (0140) não tem branch para essa fonte: cai no lookup de `faixas_cep`, não acha, e levanta "Entrega indisponível para o CEP informado". A primeira loja real que subir uma tabela trava o checkout.

4. **Confirmação de pagamento reprocessa se o pedido passou de "Enviado".** O guard de idempotência em `asaas-confirmar.ts` só faz curto-circuito para três status. A Asaas reenvia eventos de pagamento por dias; com o pedido em `Entregue`/`Concluído`/`Em Disputa`/`Cancelado` o guard não pega, e a confirmação reescreve o status, remarca `linha_itens.pago`, reenvia códigos por WhatsApp e redespacha a entrega.

5. **Rateio de frete por item não soma o total do pedido.** `pedidos.valor_pedido` usa o frete arredondado no nível do pedido; `linha_itens.valor_frete` é arredondado por linha. A soma das linhas diverge do total cobrado, e essa divergência entra no cálculo de repasse e nos extratos do seller.

## What Changes

- **Constraint de unicidade de repasse por seller:** índice parcial `unique (pedido_id, destino) where afiliado_id is null`, para que `repasses_recalcular_pedido` faça upsert em vez de inserir duplicata. Migration nova (próximo número livre, hoje `0150`).
- **Claim atômico antes da transferência:** `transferirRepasse` passa a marcar a linha como `processando` via `update ... where id = $1 and status = 'pendente' returning id` e só chama `createPixTransfer` se a marcação retornou linha. Novo valor no `check` de `repasses.status`. Em caso de erro na transferência, a linha volta para `falhou` (comportamento atual); em caso de sucesso, vai para `transferido`.
- **Branch `tabela_importada` em `checkout_criar_pedido`:** quando `v_transp_fonte = 'tabela_importada'`, o RPC reexecuta `cotar_frete_tabela` server-side (nunca confia no valor vindo do client) e define `v_frete` a partir do retorno, espelhando o branch `uber_direct`. Sem match, mensagem de erro específica ("tabela de frete desta transportadora não cobre o CEP"), não a genérica de CEP.
- **Guard de idempotência por fato consumado:** a confirmação passa a curto-circuitar quando `pedidos.dt_pagamento is not null` (pagamento já registrado), em vez de comparar contra uma lista fixa de status.
- **Rateio de frete com resto na última linha:** a última `linha_itens` recebe `v_frete` menos a soma das linhas anteriores, garantindo `sum(linha_itens.valor_frete) = pedidos.valor_pedido - v_total_itens`.

## Capabilities

### New Capabilities
- `confirmacao-pagamento/idempotencia`: a confirmação de pagamento (webhook Asaas e verificação manual) executa efeitos colaterais no máximo uma vez por pedido, independente de quantas vezes for reexecutada e de qual status o pedido tenha alcançado.
- `repasse-automatico/execucao-unica`: o repasse automático ao seller e ao afiliado transfere cada valor via PIX no máximo uma vez, mesmo sob reexecução ou concorrência do recálculo.
- `checkout-frete/tabela-transportadora`: um pedido cujo frete escolhido veio de uma tabela de transportadora importada é criado com o valor de frete correto, validado no servidor, e a soma dos fretes das linhas fecha com o total do pedido.

### Modified Capabilities
(nenhuma capability existente em `openspec/specs/` cobre esse fluxo hoje; os specs deste change são a primeira definição formal dele)

## Impact

- `supabase/migrations/0150_*.sql` (nova): índice parcial de unicidade em `repasses`; `check` de `repasses.status` estendido com `processando`; `create or replace function repasses_recalcular_pedido` (o `on conflict` do bloco de seller passa a mirar o novo índice); `create or replace function checkout_criar_pedido` (BASE de 3 args, 0140) com o branch `tabela_importada` e o rateio com resto.
- `src/lib/repasses.ts`: `transferirRepasse` ganha o claim atômico antes de `createPixTransfer`.
- `src/lib/asaas-confirmar.ts`: `confirmarPagamentoPedido` troca o guard de status por `dt_pagamento is not null`.
- `src/app/api/checkout/cotar-frete/route.ts`: sem mudança de lógica; a rota já devolve o preço da tabela, o RPC é que passa a aceitá-lo. Confirmar que o `transportadora_id` devolvido para a opção de tabela é o da transportadora `tabela_importada` (é, hoje: `tabelaRow.transportadora_id`).
- Não altera o webhook Asaas (`route.ts`), o token timing-safe, nem a lógica de split (segue descartado, transferência PIX via `POST /v3/transfers`, decisão de 10/07 e revert de 03/08 reafirmado em 13/08).
- Não altera o repasse ao afiliado no que diz respeito a D-E4.1: a transferência PIX ao afiliado já existe no código (`chave_pix_elegivel_repasse_afiliado`, `afiliado_dados_pix`, 0129) e o claim atômico do item 2 se aplica igualmente a ela; este change não reabre a decisão de quem paga o afiliado.

## Non-goals

- Refatorar `checkout_criar_pedido` para sair da cadeia de overloads 3/4/5/6 args ou tirar a comissão de 5% hardcoded do corpo. Isso é o esforço monolito-modular M2, fora deste change.
- Introduzir estorno automático via API Asaas. O estorno segue registro interno (decisão de 25/07, `0084`).
- UI de gestão de faixas de frete importadas (listar/editar/desativar pela tela). Já era item aberto do change `transportadoras-tabela-frete-upload` (tasks 5.2 e 6.x) e continua lá.
- Migrar `pedidos.valor_recebido_industria` de `text` para `numeric`. Smell conhecido, ticket avulso.

## Assumptions (a validar)

- **`cotar_frete_tabela` é seguro para `security definer` chamada de dentro do RPC:** ela já é `security definer set search_path = public` (0146/0148) e `grant execute to authenticated`; chamá-la de dentro de `checkout_criar_pedido` (também `security definer`) é nested call, não passa por grants de PUBLIC. Confirmar na implementação que o `p_peso` passado é o mesmo placeholder de 0kg que o resto do fluxo usa (`docs/prd/fluxo-frete-completo.md`), senão nenhuma faixa casa (mesmo bug latente já anotado no relatório da auditoria, item P2 original).
- **Nenhum repasse `processando` órfão hoje:** o novo status só passa a existir com a migration; não há dado legado nesse estado. Um repasse que fique preso em `processando` (crash entre o claim e o fim da transferência) precisa de tratamento no `/admin/repasses` (reprocessar ou marcar `falhou` manualmente). Definir isso nos specs.
- **A confirmação já era idempotente na prática para os 3 status cobertos:** a troca para `dt_pagamento is not null` amplia a cobertura sem mudar o caminho feliz. Verificar que `dt_pagamento` é sempre gravado junto com o status "Pagamento Realizado" (é, `asaas-confirmar.ts:311`) e que nenhum outro caminho seta status de pago sem setar `dt_pagamento`.
