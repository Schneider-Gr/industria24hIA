## Purpose

Oferece uma opção real de frete via Uber Direct no checkout quando nenhuma transportadora interna cobre o CEP do comprador, para que o pedido não se perca por falta de cobertura de entrega.

## ADDED Requirements

### Requirement: Cotação de frete prioriza transportadora interna
O sistema SHALL cotar frete via Uber Direct apenas quando nenhuma transportadora `fonte='interna'` cobre o CEP informado pelo comprador.

#### Scenario: CEP coberto por transportadora interna
- **WHEN** o comprador informa um CEP coberto por uma faixa de uma transportadora interna ativa da loja (ou global)
- **THEN** o sistema exibe apenas a opção de frete interno, sem consultar a Uber Direct

#### Scenario: CEP sem cobertura interna e Uber Direct disponível
- **WHEN** o comprador informa um CEP sem nenhuma faixa interna aplicável e a Uber Direct está configurada e cobre a rota
- **THEN** o sistema cota a entrega via Uber Direct e exibe o valor e prazo retornados como opção de frete

#### Scenario: Sem cobertura interna nem Uber Direct
- **WHEN** nenhuma transportadora interna cobre o CEP e a Uber Direct também não consegue cotar a rota (fora de área, não configurada, ou erro do provider)
- **THEN** o sistema não exibe nenhuma opção de frete e o comprador só pode prosseguir escolhendo retirada na loja (quando permitida)

### Requirement: Preço do pedido usa a cotação salva, nunca um valor do client
Quando o comprador escolhe a opção de frete Uber Direct, o valor de frete gravado no pedido SHALL vir de uma cotação previamente salva no servidor, identificada por um id de cotação — nunca de um valor numérico enviado diretamente pelo formulário do checkout.

#### Scenario: Cotação válida no momento da confirmação
- **WHEN** o comprador confirma o pedido com a opção Uber Direct escolhida e a cotação salva ainda não expirou
- **THEN** o pedido é criado usando o valor de frete da cotação salva

#### Scenario: Cotação expirada ou inexistente
- **WHEN** o comprador confirma o pedido com a opção Uber Direct escolhida mas a cotação salva expirou ou não é encontrada
- **THEN** a criação do pedido é rejeitada com uma mensagem pedindo para atualizar a página e cotar novamente

### Requirement: Frete por loja em carrinho multi-loja
Quando o carrinho tem itens de mais de uma loja (cada loja gera um pedido próprio), o sistema SHALL cotar e aplicar o frete de forma independente para cada loja.

#### Scenario: Carrinho com duas lojas, coberturas diferentes
- **WHEN** o carrinho tem itens de duas lojas, uma coberta por transportadora interna e outra sem cobertura interna mas cotável via Uber Direct
- **THEN** o pedido da primeira loja usa o frete interno e o pedido da segunda usa o frete Uber Direct, cada um com seu próprio valor

### Requirement: Despacho pós-pagamento por sinal explícito
Quando o pedido foi criado com a transportadora Uber Direct, a confirmação de pagamento SHALL despachar a entrega via Uber Direct usando esse sinal explícito, sem depender de heurística sobre a ausência de outro tipo de despacho.

#### Scenario: Pedido pago com transportadora Uber Direct
- **WHEN** o pagamento de um pedido cuja transportadora escolhida é Uber Direct é confirmado
- **THEN** o sistema despacha a entrega via Uber Direct e não publica uma corrida no pool geral de parceiros para esse pedido
