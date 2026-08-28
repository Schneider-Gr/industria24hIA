## Purpose

Garante que um pedido cujo frete escolhido no checkout veio de uma tabela de transportadora importada (`fonte = 'tabela_importada'`, feature do PR #441) seja efetivamente criado, com o valor de frete validado no servidor a partir da tabela, e que a soma dos fretes das linhas do pedido feche exatamente com o total cobrado.

## ADDED Requirements

### Requirement: Checkout aceita frete de tabela importada
O sistema SHALL, em `checkout_criar_pedido`, quando a transportadora escolhida tiver `fonte = 'tabela_importada'`, calcular o valor do frete reexecutando `cotar_frete_tabela` no servidor (com a loja resolvida, o CEP de destino e o peso do carrinho), e SHALL usar esse valor, ignorando qualquer valor de frete vindo do client.

#### Scenario: Loja com tabela importada, CEP coberto
- **WHEN** o comprador escolhe a opção "Frete (tabela da transportadora)" no checkout, para uma loja que tem faixa em `transportadora_faixas_frete` cobrindo o CEP e o peso
- **THEN** o pedido é criado com `pedidos.valor_pedido = total_itens + valor_da_faixa` e `linha_itens.transportadora_id` apontando para a transportadora `tabela_importada`

#### Scenario: Loja com tabela importada, CEP fora da tabela
- **WHEN** o comprador escolhe a opção de tabela mas nenhuma faixa de `transportadora_faixas_frete` cobre o CEP ou o peso
- **THEN** `checkout_criar_pedido` levanta um erro específico indicando que a tabela de frete daquela transportadora não cobre o endereço, distinto da mensagem genérica de CEP sem cobertura do motor de percentual

#### Scenario: Valor de frete adulterado no client
- **WHEN** o request de checkout chega com um valor de frete diferente do que `cotar_frete_tabela` retorna para os mesmos parâmetros
- **THEN** o pedido é criado com o valor calculado no servidor, não com o valor recebido

### Requirement: Soma dos fretes das linhas fecha com o total
O sistema SHALL distribuir o valor total do frete entre as linhas do pedido de forma que `sum(linha_itens.valor_frete)` seja exatamente igual a `pedidos.valor_pedido - sum(valor_item)`, sem divergência de arredondamento.

#### Scenario: Frete rateado entre múltiplas linhas
- **WHEN** um pedido tem 3 linhas e o frete calculado (percentual, tabela ou Uber Direct) precisa ser rateado
- **THEN** as duas primeiras linhas recebem o rateio arredondado a 2 casas e a última recebe o frete total menos a soma das anteriores, de modo que a soma das 3 linhas seja igual ao frete do pedido

#### Scenario: Pedido de uma linha só
- **WHEN** o pedido tem uma única linha
- **THEN** `linha_itens.valor_frete` dessa linha é igual ao frete total do pedido

## MODIFIED behavior notes

- Altera `checkout_criar_pedido` (BASE de 3 args, redefinida por último em `0140`): adiciona o branch `v_transp_fonte = 'tabela_importada'` (hoje ausente; a fonte cai por engano no lookup de `faixas_cep` e levanta "Entrega indisponível para o CEP informado").
- O branch novo espelha o de `uber_direct`: resolve o frete de uma fonte confiável do servidor antes do `insert`, e o CEP não é validado de novo contra `faixas_cep` para esse caminho.
- O loop de gravação de `linha_itens` passa a acumular o frete já rateado e atribuir o resto à última iteração, em vez de arredondar cada linha isoladamente. Vale para os três caminhos de frete (`interna`, `uber_direct`, `tabela_importada`).
- `cotar-frete/route.ts` não muda: já devolve a opção de tabela com `transportadora_id = tabelaRow.transportadora_id`.
