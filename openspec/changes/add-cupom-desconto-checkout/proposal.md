<!-- Issue: Schneider-Gr/industria24hIA#491 -->

## Why

O marketplace só tem um mecanismo de desconto hoje: `promocoes_progressivas` —
faixa de preço por quantidade, por produto, gerida pelo seller. Não existe código
promocional aplicável no checkout, nem forma de a plataforma custear uma campanha
que atravessa lojas, nem de agrupar descontos heterogêneos (produto A com 15%,
produto B com R$50) sob um único código. Cupom é a alavanca comercial que falta
para campanhas de aquisição, reativação e datas sazonais.

## What Changes

- Nova entidade **cupom**: código único, dono (nesta entrega sempre
  `plataforma`), janela de validade, valor mínimo de pedido, teto de usos global
  e teto por cliente. A coluna `dono` já nasce para acomodar cupom de seller na
  fase 2, mas o MVP só aceita `plataforma`.
- Nova entidade **regra de cupom**: lista de regras `{alvo, tipo, valor}` onde
  `alvo ∈ {produto, categoria, loja, tudo}` e `tipo ∈ {percentual, valor_fixo}`.
  Um cupom carrega N regras — é isso que permite "descontos diferentes para
  vários produtos com o mesmo cupom", inclusive uma regra `loja` que dá desconto
  em todos os itens de uma loja.
- Nova entidade **uso de cupom**: registro por checkout para auditoria e
  enforcement dos tetos, com consumo atômico.
- **Custeio pela plataforma (Opção C)**: o desconto de cupom NÃO altera
  `linha_itens.valor` nem os repasses. `linha_itens.valor` continua sendo o preço
  cheio (faixa progressiva vigente × quantidade), então `repasse_ind` (5%) e
  `repasse_afiliado` seguem calculados exatamente como hoje — a comissão do
  afiliado e o resíduo do seller ficam intocados por construção. O abatimento do
  cupom é gravado à parte, em `linha_itens.desconto_cupom`, e só reduz
  `pedidos.valor_pedido` (o que o comprador paga e a base da cobrança Asaas).
  Como `repasse_ind` é margem retida da plataforma (não gera transferência), a
  plataforma simplesmente recebe menos do comprador — o ledger de repasse
  (`repasses_recalcular_pedido`, 0111; `calcular_repasses_pedido`, 0084) não
  muda.
- **Piso de repasse**: o desconto de cada linha é limitado a `repasse_ind` da
  linha. Se a regra do cupom concederia mais, o desconto da linha é reduzido ao
  teto (a plataforma não paga do próprio bolso além da própria margem). Se
  `repasse_ind` da linha for zero, a linha não recebe desconto.
- **Não acumula com desconto progressivo / coletiva**: por item, o desconto do
  cupom é `max(0, (preço_faixa − preço_cupom)) × quantidade` — quando a faixa
  progressiva já é melhor, o desconto do cupom naquele item é zero.
- **Aplicação server-side**: o código do cupom entra no checkout dentro do objeto
  `entrega` (padrão dos parâmetros de 0107/0140); a RPC `checkout_criar_pedido`
  recalcula o desconto no banco via função pura compartilhada, grava
  `linha_itens.valor` cheio + `desconto_cupom` + `cupom_id`, e grava
  `pedidos.valor_pedido` já líquido. O client nunca informa o valor do desconto.
- **Multiloja (1 pedido por loja)**: o cupom é reavaliado contra os itens de cada
  pedido; o "rateio proporcional" é emergente, não há passo de divisão de um
  valor global. O teto de usos conta o checkout como um único uso.
- Nova tela **admin** para criar/editar/desativar cupons e editar suas regras, e
  o campo de cupom em `src/app/checkout/`.

Fora de escopo desta entrega:

- **Cupom criado e custeado pelo seller.** Depende de o seller absorver o
  desconto, e o único ponto de pagamento ao seller (`repasses_recalcular_pedido`,
  0111) soma `linha_itens.repasse_vendedor` — coluna que **nenhuma migration e
  nenhum código do app escrevem hoje** (só é lida e protegida por guard). Cupom
  de seller e a correção de `repasse_vendedor` são a fase 2.
- Frete grátis por cupom, empilhamento de cupom com progressivo, cupom em compra
  coletiva e em venda futura, cupom de afiliado, código de cupom repetido.

## Capabilities

### New Capabilities
- `checkout-cupom-desconto`: cadastro de cupons de plataforma com regras por
  cesta, validação e aplicação do cupom no checkout, custeio pela margem da
  plataforma sem tocar o ledger de repasse, precedência sobre desconto
  progressivo, piso de repasse e enforcement de tetos de uso.

### Modified Capabilities
<!-- Nenhuma. `seller-promocoes` (desconto progressivo) não muda de
     comportamento; a regra de não-acumulação é definida pela nova capability e
     apenas lê o preço de faixa já existente. `seller-pedidos` exibe o desconto
     mas seu contrato de requisitos não muda. -->

## Impact

- **Banco**: novas tabelas `cupons`, `cupom_regras`, `cupom_usos` (RLS
  deny-by-default, gestão só por admin); novas colunas `cupom_id` e
  `desconto_cupom` (nullable, default null) em `linha_itens`; nova migration
  numerada. **`repasses_recalcular_pedido` e `calcular_repasses_pedido` não são
  tocadas.**
- **RPC `checkout_criar_pedido`**: passa a ler `cupom_codigo` e `checkout_ref` de
  `entrega`, calcular o desconto por linha via função SQL `cupom_aplicar`, gravar
  `desconto_cupom`/`cupom_id` na linha e `pedidos.valor_pedido` líquido.
- **Nova RPC de validação** (`cupom_validar`) para o preview do desconto na tela
  de checkout antes da finalização.
- **`src/lib/`**: nova função pura de aplicação de cupom (regra por item, melhor
  preço vs. faixa, piso de `repasse_ind`) com teste companheiro red-green;
  consome `precoFaixa` de `src/lib/preco-faixa.ts`.
- **Caminho do dinheiro**: `pedido.valor_pedido` e a cobrança Asaas passam a
  refletir o desconto; os repasses NÃO mudam. Aciona as skills
  `asaas-pagamentos`, `regras-de-negocio`, `migrations-industria24`,
  `rls-seguranca`, `tdd-red-green-refactor`.
- **UI**: `src/app/(admin)/admin/` nova rota de cupons; campo de cupom em
  `src/app/checkout/`.
- **Cancelamento pré-pagamento**: a rotina que cancela pedido com cobrança
  pendente passa a liberar o uso do cupom (`delete from cupom_usos` +
  decremento).
