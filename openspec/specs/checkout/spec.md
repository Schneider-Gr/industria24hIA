# Checkout Specification

## Purpose
Fluxo de carrinho, checkout e criação de pedido, incluindo multi-loja, frete, compra coletiva, leilão e venda futura. Estado: ✅ produção. Fonte: skills `regras-de-negocio`, `industria24-marketplace`; código em `carrinho/`, `checkout/`, `pedido/`, `coletiva/`, `compra-coletiva/`, `coletivas/`, `leilao/`, `src/lib/coletiva.ts`, `src/lib/preco-faixa.ts`, `src/lib/cep.ts`, RPC `checkout_criar_pedido`.

## Requirements

### Requirement: Fluxo padrão de pedido
O sistema SHALL seguir o fluxo Carrinho → Checkout → Pagamento (Asaas) → Pedido → Entrega → Repasse para toda compra com estoque imediato.

#### Scenario: Compra padrão do início ao fim
- GIVEN um comprador com itens no carrinho
- WHEN ele finaliza o checkout e o pagamento é confirmado
- THEN o pedido é criado, a entrega é despachada e o repasse é calculado, nessa ordem

### Requirement: Checkout multi-loja
O sistema SHALL permitir que um único checkout gere itens de múltiplas lojas, respeitando o pedido mínimo (`ValorPedidoMinimo`) e a opção de retirada na loja (`RetiradaNaLoja`) configurados POR LOJA, nunca globalmente.

#### Scenario: Carrinho com itens de duas lojas
- GIVEN um carrinho com itens de Loja A e Loja B
- WHEN o comprador finaliza o checkout
- THEN o pedido resultante respeita o valor mínimo e a política de retirada de cada loja individualmente

### Requirement: Frete por CEP, peso e categoria
O sistema SHALL calcular o frete ad valorem usando a tabela `FaixaCEP` (CEPInicial, CEPFinal, ICMS, AdValorem, KgAdicional, PesoFinal) combinada a peso e categoria do produto.

#### Scenario: Cálculo de frete no checkout
- GIVEN um item com peso e categoria definidos e um CEP de entrega informado
- WHEN o checkout calcula o frete
- THEN o valor é obtido pela faixa de `FaixaCEP` correspondente ao CEP, peso e categoria

### Requirement: Consolidação de carga por rota
O sistema SHALL oferecer consolidação de frete quando pedidos pagos da MESMA loja e mesmo corredor de CEP (prefixo de 3 dígitos) formam um lote único, aplicando 30% de desconto fixo no frete (plataforma repassa 100% do frete, sem margem na v1).

#### Scenario: Comprador opta por consolidação no checkout
- GIVEN pedidos elegíveis (mesma loja, mesmo corredor de CEP)
- WHEN o comprador marca o checkbox de frete consolidado no checkout
- THEN `pedidos.frete_consolidado` é marcado e o pedido entra na fila de lote em `/admin/lotes`, sem despacho automático imediato

### Requirement: Gate de Venda Futura para B2B
O sistema MUST restringir a compra de itens de Venda Futura a compradores B2B, exigindo CNPJ/IE válidos e aceite explícito dos Termos do Mercado Futuro por pedido.

#### Scenario: Comprador B2C tenta comprar item de venda futura
- GIVEN um item com `Disponibilidade` de tipo `VendaFutura`
- WHEN um comprador sem CNPJ/IE tenta finalizar a compra
- THEN o checkout bloqueia a compra até o gate B2B ser satisfeito

#### Scenario: Aceite de termos por pedido
- GIVEN um comprador B2B elegível comprando item de venda futura
- WHEN ele finaliza o checkout
- THEN o aceite dos Termos do Mercado Futuro é registrado (carimbo via service role) para aquele pedido especificamente, não uma vez só para a conta

### Requirement: Repasse calculado por linha de item
O sistema SHALL calcular, para cada `LinhaItem` do pedido, o repasse à plataforma (`RepasseInd24`, 5%) e ao lojista (95%), somando `RepasseAfiliado` quando a compra ocorrer via link `?ref=`.

#### Scenario: Pedido com afiliado
- GIVEN um pedido criado a partir de um link `?ref=`
- WHEN o repasse é calculado por linha
- THEN a fatia de `RepasseAfiliado` sai do que sobra após a retenção da plataforma, sem alterar a comissão da plataforma

### Requirement: Overload de RPC de checkout sem DEFAULT ambíguo
O sistema MUST NOT introduzir parâmetros com `DEFAULT` em overloads da RPC de criação de pedido — overload ambíguo (erro Postgres 42725) já quebrou em produção toda compra realizada com `?ref=`.

#### Scenario: Nova versão da RPC de checkout
- GIVEN uma mudança proposta na RPC `checkout_criar_pedido`
- WHEN um novo parâmetro precisa ser adicionado
- THEN o parâmetro é adicionado sem `DEFAULT` em overload, evitando ambiguidade de assinatura

### Requirement: Compra coletiva — meta não fecha a coletiva
O sistema SHALL manter uma compra coletiva aberta até o prazo definido mesmo após bater a meta mínima de participantes, atualizando o status para `Viavel` e permitindo descer de lote (até 4 lotes, preço estritamente decrescente) sem cobrar ninguém antes do fechamento.

#### Scenario: Meta atingida antes do prazo
- GIVEN uma compra coletiva com meta mínima atingida e prazo ainda não vencido
- WHEN novos participantes entram
- THEN a coletiva permanece aberta, pode descer para o próximo lote de preço, e nenhum participante é cobrado ainda

#### Scenario: Fechamento cobra o melhor lote atingido
- GIVEN uma compra coletiva no prazo de fechamento
- WHEN o prazo se encerra
- THEN todos os participantes pagam o preço do melhor lote atingido, com prazo de 48h para pagamento; quem não paga tem o pedido cancelado e o estoque devolvido; quem paga mantém o preço travado sem re-rateio para cima

### Requirement: Repasse sobre valor rateado da coletiva
O sistema SHALL aplicar o repasse de 5% por linha sobre o valor já rateado da compra coletiva, seguindo a mesma regra de repasse do checkout padrão.

#### Scenario: Repasse de item de compra coletiva
- GIVEN uma compra coletiva fechada com preço do melhor lote atingido
- WHEN o repasse é calculado
- THEN os 5% de `RepasseInd24` incidem sobre o valor já rateado por participante, não sobre o preço de tabela original

## Known Gaps
- Sem regra documentada para cancelamento/estorno geral, disputa fora do fluxo de pós-venda (PRD 009), `ConsorcioPromotor`, e pagamento PAGO parcial vs. total — não implementar sem confirmar com o dono do produto.
