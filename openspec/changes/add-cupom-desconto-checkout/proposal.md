<!-- Issue: Schneider-Gr/industria24hIA#491 -->

## Why

O marketplace só tem um mecanismo de desconto hoje: `promocoes_progressivas` —
faixa de preço por quantidade, por produto, gerida pelo seller. Não existe código
promocional aplicável no checkout, nem forma de a plataforma custear uma campanha
que atravessa lojas, nem de agrupar descontos heterogêneos (produto A com 15%,
produto B com R$50) sob um único código. Cupom é a alavanca comercial que falta
para campanhas de aquisição, reativação e datas sazonais.

## What Changes

- Nova entidade **cupom**: código único, dono (`plataforma` quando criado por
  admin, `loja` quando criado por seller), janela de validade, valor mínimo de
  pedido, teto de usos global e teto por cliente.
- Nova entidade **regra de cupom**: lista de regras `{alvo, tipo, valor}` onde
  `alvo ∈ {produto, categoria, loja, tudo}` e `tipo ∈ {percentual, valor_fixo}`.
  Um cupom carrega N regras — é isso que permite "descontos diferentes para
  vários produtos com o mesmo cupom".
- Nova entidade **uso de cupom**: registro por pedido para auditoria e
  enforcement dos tetos, com consumo atômico.
- **Custeio "quem cria paga"**: desconto de cupom de seller sai do
  `repasse_vendedor`; desconto de cupom de plataforma sai do `repasse_ind`. A
  comissão do afiliado (`repasse_afiliado`) nunca é reduzida por cupom.
- **Escopo derivado do dono**: cupom de seller só vale para itens da própria
  loja; cupom de plataforma vale em qualquer loja e, num checkout multiloja
  (1 pedido por loja), rateia o desconto proporcionalmente ao valor de
  mercadoria de cada pedido.
- **Não acumula com desconto progressivo / coletiva**: por item, o sistema
  compara o preço com faixa progressiva e o preço com cupom e aplica o menor —
  nunca os dois.
- **Aplicação server-side**: o código do cupom entra no checkout; a RPC
  `checkout_criar_pedido` recalcula o desconto no banco via função pura
  compartilhada e grava o valor líquido e os repasses ajustados na linha do
  pedido. O client nunca informa o valor do desconto.
- **Piso de repasse**: se o desconto de um item exceder o repasse de quem o
  custeia (considerando afiliado protegido), o cupom não se aplica àquele item;
  o restante do carrinho segue.
- Nova tela **admin** para criar/editar/desativar cupons de plataforma e uma
  seção equivalente no painel **seller** para cupons da própria loja.

Fora de escopo desta entrega: frete grátis por cupom, empilhamento de cupom com
progressivo, cupom em compra coletiva e em venda futura, cupom de afiliado,
código de cupom repetido entre escopos.

## Capabilities

### New Capabilities
- `checkout-cupom-desconto`: cadastro de cupons (plataforma e loja) com regras
  por cesta, validação e aplicação do cupom no checkout, custeio por dono,
  rateio multiloja, precedência sobre desconto progressivo, piso de repasse e
  enforcement de tetos de uso.

### Modified Capabilities
<!-- Nenhuma. `seller-promocoes` (desconto progressivo) não muda de
     comportamento; a regra de não-acumulação é definida pela nova capability e
     apenas lê o preço de faixa já existente. `seller-pedidos` exibe o desconto
     mas seu contrato de requisitos não muda. -->

## Impact

- **Banco**: novas tabelas `cupons`, `cupom_regras`, `cupom_usos` (RLS
  deny-by-default); novas colunas em `linha_itens` para vincular o cupom e
  registrar o desconto aplicado; nova migration numerada.
- **RPC `checkout_criar_pedido`**: passa a aceitar o identificador do cupom
  (dentro do objeto `entrega`, seguindo o padrão dos parâmetros adicionados em
  0107/0140) e a calcular o desconto e os repasses ajustados.
- **Nova RPC de validação** (`cupom_validar` ou equivalente) para o preview do
  desconto na tela de checkout antes da finalização.
- **`src/lib/`**: nova função pura de aplicação de cupom (regra por item,
  escolha do melhor preço, rateio, piso de repasse) com teste companheiro
  red-green; consome `precoFaixa` de `src/lib/preco-faixa.ts`.
- **Caminho do dinheiro**: toca `repasse_vendedor` / `repasse_ind` na criação do
  pedido e o valor da cobrança Asaas (`pedido.valor_pedido` já líquido). Aciona
  as skills `asaas-pagamentos`, `regras-de-negocio`, `migrations-industria24`,
  `rls-seguranca`, `tdd-red-green-refactor`.
- **UI**: `src/app/(admin)/admin/` nova rota de cupons; `src/app/(seller)/seller/`
  nova seção; campo de cupom em `src/app/checkout/`.
- **Repasse na entrega**: `repasses_recalcular_pedido` (migration 0111) soma
  `linha_itens.repasse_vendedor/afiliado` — como os valores já nascem líquidos,
  não muda, mas precisa de verificação.
