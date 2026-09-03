# checkout-cupom-desconto Specification

## Purpose
Permite a plataforma criar cupons de desconto com regras heterogêneas por cesta
de produtos, aplicá-los no checkout com cálculo autoritativo no servidor, e
custear o desconto pela margem da própria plataforma (`repasse_ind`) sem alterar
o valor das linhas nem os repasses de seller e afiliado.
## Requirements
### Requirement: Cadastro de cupom de plataforma
O sistema SHALL registrar cada cupom com um código textual único
(case-insensitive), uma janela de validade com início e fim, um valor mínimo de
pedido opcional, um teto de usos global opcional e um teto de usos por cliente
com valor padrão 1. Cada cupom SHALL ter uma coluna `dono`, que é `plataforma`
(criado por admin) ou `loja` (criado por um seller, com `loja_id` obrigatório
apontando para a própria loja). Um admin SHALL poder gerenciar cupons de dono
`plataforma` e SHALL poder moderar (desativar) cupons de dono `loja`; um seller
SHALL poder gerenciar apenas cupons de dono `loja` cuja `loja_id` é a própria
loja. Um cupom de plataforma SHALL ser elegível para
itens de qualquer loja durante a janela de validade; um cupom de loja SHALL ser
elegível apenas para itens da loja dona do cupom.

#### Scenario: Admin cria cupom de plataforma
- **WHEN** um admin cria um cupom informando código, validade e regras
- **THEN** o cupom é salvo com dono `plataforma` e passa a ser elegível para
  itens de qualquer loja durante a janela de validade

#### Scenario: Seller cria cupom da própria loja
- **WHEN** um seller cria um cupom no painel da própria loja
- **THEN** o cupom é salvo com dono `loja` e `loja_id` da própria loja, e só é
  elegível para itens dessa loja

#### Scenario: Código duplicado é rejeitado
- **WHEN** alguém tenta criar um cupom com um código que já existe, em qualquer
  dono, diferenciando apenas maiúsculas/minúsculas
- **THEN** a criação é rejeitada e nenhum cupom é gravado

#### Scenario: Não-admin não gerencia cupom
- **WHEN** um usuário que não é admin tenta criar, editar ou desativar um
  cupom de dono `plataforma`
- **THEN** a operação é negada

#### Scenario: Seller não gerencia cupom de outra loja
- **WHEN** um seller tenta criar, editar ou desativar um cupom com `loja_id`
  de outra loja
- **THEN** a operação é negada

### Requirement: Regras de desconto por alvo
Um cupom SHALL conter uma ou mais regras, cada uma com um alvo, um tipo
(`percentual` ou `valor_fixo`) e um valor positivo. Para cupom de dono
`plataforma`, o alvo SHALL ser um de `produto`, `categoria`, `loja` ou `tudo`.
Para cupom de dono `loja`, o alvo SHALL ser um de `produto` ou `loja` apenas.
Para cada item do carrinho, o sistema SHALL selecionar a regra aplicável de
alvo mais específico na ordem `produto` > `categoria` > `loja` > `tudo`; se
nenhuma regra casar, o item não recebe desconto do cupom. Regra de tipo
`percentual` SHALL ter valor entre 0 exclusive e 100 inclusive; regra de
`valor_fixo` SHALL ser interpretada como desconto por unidade do item, limitado
ao preço unitário vigente.

#### Scenario: Cupom com descontos diferentes por produto
- **WHEN** um cupom tem regra de 15% para o produto A e regra de R$50 por unidade
  para o produto B, e o carrinho contém A e B
- **THEN** o item A recebe 15% de desconto e o item B recebe R$50 por unidade,
  ambos sob o mesmo código

#### Scenario: Precedência de regra mais específica
- **WHEN** um cupom tem regra `tudo` de 5% e regra `produto` de 20% para o
  produto X, e o carrinho contém X
- **THEN** o item X recebe 20% (regra de produto vence a regra `tudo`)

#### Scenario: Regra de loja cobre todos os itens da loja
- **WHEN** um cupom tem regra `loja` de 10% para a loja Z e o carrinho contém
  três itens da loja Z sem regra mais específica
- **THEN** os três itens recebem 10% de desconto

#### Scenario: Desconto fixo não deixa o item negativo
- **WHEN** uma regra de `valor_fixo` tem valor maior que o preço unitário vigente
  do item
- **THEN** o desconto aplicado ao item é no máximo o preço unitário vigente, sem
  gerar valor negativo

#### Scenario: Cupom de loja rejeita alvo categoria ou tudo
- **WHEN** um seller tenta cadastrar uma regra de alvo `categoria` ou `tudo`
  para um cupom de dono `loja`
- **THEN** a criação da regra é rejeitada

### Requirement: Não acumulação com desconto progressivo e coletiva
Para cada item, o sistema SHALL calcular o preço unitário com cupom aplicando a
regra sobre o preço base do produto, e SHALL comparar esse preço com o preço
unitário resultante da faixa de desconto progressivo vigente (quando houver),
usando o menor dos dois como preço final do item. O sistema NÃO SHALL somar o
desconto do cupom com o desconto progressivo. Para cupom de dono `plataforma`,
esse preço final SHALL ser usado apenas para calcular o desconto registrado em
`linha_itens.desconto_cupom`; `linha_itens.valor` continua sendo o preço cheio.
Para cupom de dono `loja`, esse preço final SHALL ser o próprio
`linha_itens.valor` gravado.

#### Scenario: Progressivo é melhor que o cupom
- **WHEN** um item tem faixa progressiva que resulta em preço unitário R$80 e o
  cupom resultaria em R$85
- **THEN** o desconto do cupom para esse item é zero e o item é cobrado a R$80

#### Scenario: Cupom é melhor que o progressivo
- **WHEN** um item tem faixa progressiva que resulta em R$90 e o cupom resultaria
  em R$75
- **THEN** o desconto do cupom para esse item é R$15 por unidade

#### Scenario: Item de preço cheio
- **WHEN** um item não tem faixa progressiva ativa e casa com uma regra do cupom
- **THEN** o cupom é aplicado sobre o preço base do item

#### Scenario: Cupom de loja é melhor que o progressivo
- **WHEN** um item tem faixa progressiva que resulta em R$90 e um cupom de loja
  resultaria em R$75
- **THEN** `linha_itens.valor` é gravado como R$75 × quantidade, e
  `repasse_ind`/`repasse_afiliado` são calculados sobre esse valor

### Requirement: Custeio pela margem da plataforma
Cupom de dono `plataforma` SHALL manter `linha_itens.valor` igual ao preço
cheio (faixa vigente × quantidade), sem subtrair o desconto do cupom, de forma
que `repasse_ind` e `repasse_afiliado` da linha sejam calculados exatamente
como seriam sem o cupom. O desconto do cupom SHALL ser gravado em
`linha_itens.desconto_cupom` e o vínculo em `linha_itens.cupom_id`. O sistema
NÃO SHALL alterar `repasses_recalcular_pedido` nem o ledger `repasses`.
`pedidos.valor_pedido` SHALL ser `Σ(linha_itens.valor) + frete −
Σ(linha_itens.desconto_cupom)`.

Cupom de dono `loja` SHALL ser custeado pela redução direta do preço do item:
`linha_itens.valor` SHALL refletir o preço já com o desconto aplicado (ver
"Não acumulação"), e `repasse_ind`/`repasse_afiliado` SHALL ser calculados
sobre esse valor reduzido — o mesmo mecanismo que já se aplica ao desconto
progressivo. O sistema NÃO SHALL escrever ou depender de
`linha_itens.repasse_vendedor` para custear cupom de loja.
`linha_itens.desconto_cupom`/`cupom_id` SHALL ser gravados também para cupom
de loja, para auditoria, sem efeito em nenhum cálculo de repasse.

#### Scenario: Repasses da linha não mudam
- **WHEN** um cupom de dono `plataforma` concede R$30 de desconto a uma linha
- **THEN** `linha_itens.valor` permanece o preço cheio, `repasse_ind` e
  `repasse_afiliado` da linha são os mesmos que seriam sem o cupom, e
  `linha_itens.desconto_cupom` registra R$30

#### Scenario: Total do pedido reflete o desconto
- **WHEN** um pedido tem Σ(valor) de R$500, frete R$20 e Σ(desconto_cupom) de R$60
- **THEN** `pedidos.valor_pedido` é R$460 e a cobrança do gateway é criada sobre
  R$460

#### Scenario: Comissão do afiliado é preservada
- **WHEN** um item tem afiliado vinculado e recebe desconto de cupom de
  plataforma
- **THEN** o `repasse_afiliado` calculado para o item é o mesmo que seria sem o
  cupom

#### Scenario: Cupom de loja reduz o valor da linha
- **WHEN** um cupom de loja concede um preço final de R$75/un para um item de
  preço base R$100/un, quantidade 2
- **THEN** `linha_itens.valor` é gravado como R$150,00 (2×R$75), e
  `repasse_ind`/`repasse_afiliado` são calculados sobre R$150,00

### Requirement: Piso de repasse
O piso `desconto ≤ repasse_ind` da linha SHALL se aplicar apenas a cupom de
dono `plataforma`: se a regra do cupom concederia um desconto maior, o valor
gravado em `desconto_cupom` SHALL ser `repasse_ind` da linha; se `repasse_ind`
da linha for zero, a linha NÃO SHALL receber desconto. Cupom de dono `loja`
NÃO SHALL ter piso — o preço final é uma decisão do seller, sujeita ao mesmo
risco que ele já assume ao cadastrar uma faixa de desconto progressivo.

#### Scenario: Desconto maior que a margem da plataforma na linha
- **WHEN** a regra de um cupom de plataforma concederia R$40 de desconto a uma
  linha cujo `repasse_ind` é R$25
- **THEN** `linha_itens.desconto_cupom` da linha é gravado como R$25

#### Scenario: Linha sem margem
- **WHEN** uma linha tem `repasse_ind` igual a zero e um cupom de plataforma é
  aplicado
- **THEN** a linha não recebe desconto do cupom e as demais linhas seguem
  elegíveis

#### Scenario: Cupom de loja sem piso
- **WHEN** um cupom de loja concederia um desconto maior que qualquer margem
  calculada para a linha
- **THEN** o preço final ainda é aplicado integralmente, sem redução pelo piso

### Requirement: Reavaliação do cupom em checkout multiloja
Quando um checkout gera pedidos separados por loja, o sistema SHALL avaliar as
regras do cupom contra os itens de cada pedido independentemente, sem um passo de
divisão de um valor global. O teto de usos SHALL contar o checkout como um único
uso do cupom, ainda que gere múltiplos pedidos.

#### Scenario: Cupom global em carrinho de duas lojas
- **WHEN** o carrinho tem itens da loja 1 e da loja 2, gera dois pedidos, e um
  cupom de 10% em `tudo` é aplicado
- **THEN** cada pedido recebe 10% de desconto nos seus próprios itens (limitado
  ao `repasse_ind` de cada linha) e o cupom conta como um uso

### Requirement: Validação do cupom no checkout
O sistema SHALL oferecer, na tela de checkout, uma verificação do código do cupom
que retorna se ele é válido para o carrinho atual e um preview do desconto por
item, sem finalizar a compra. A verificação SHALL rejeitar cupom inexistente,
fora da janela de validade, com teto global esgotado, já usado pelo cliente
acima do teto por cliente, ou com pedido abaixo do valor mínimo. O valor mínimo
de pedido SHALL ser conferido contra o valor de mercadoria antes do desconto do
cupom.

#### Scenario: Preview de cupom válido
- **WHEN** o comprador informa um código de cupom válido para o carrinho
- **THEN** a tela mostra o desconto que será aplicado a cada item e o novo total,
  sem criar pedido

#### Scenario: Cupom expirado
- **WHEN** o comprador informa um código cuja janela de validade já terminou
- **THEN** a verificação informa que o cupom não é válido e nenhum desconto é
  previsto

#### Scenario: Pedido abaixo do valor mínimo
- **WHEN** o valor de mercadoria do carrinho antes de qualquer desconto é menor
  que o valor mínimo do cupom
- **THEN** a verificação rejeita o cupom

### Requirement: Aplicação autoritativa no servidor
Ao finalizar a compra, o sistema SHALL recalcular o desconto do cupom no banco a
partir do código informado, ignorando qualquer valor de desconto vindo do
cliente. Cada linha afetada SHALL ser gravada com `valor` cheio, `desconto_cupom`
e `cupom_id`, e `pedidos.valor_pedido` SHALL ser gravado líquido. A cobrança do
gateway de pagamento SHALL ser criada sobre o valor já líquido.

#### Scenario: Cliente adultera o valor do desconto
- **WHEN** a requisição de finalização informa um desconto maior do que as regras
  do cupom permitem
- **THEN** o servidor ignora o valor informado e grava o desconto conforme as
  regras do cupom no banco

#### Scenario: Cupom deixa de ser válido entre o preview e a finalização
- **WHEN** o teto global do cupom se esgota entre a verificação e a finalização
- **THEN** o pedido é criado sem o desconto do cupom e o comprador é informado, ou
  a finalização é rejeitada para nova conferência

### Requirement: Consumo atômico e tetos de uso
O sistema SHALL registrar um uso de cupom por checkout bem-sucedido e SHALL
impedir, de forma atômica, que o número de usos ultrapasse o teto global ou que
um mesmo cliente ultrapasse o teto por cliente, mesmo sob requisições
concorrentes. Uma nova tentativa de finalização do mesmo checkout (retry) NÃO
SHALL consumir um segundo uso.

#### Scenario: Duas finalizações concorrentes no último uso
- **WHEN** um cupom tem teto global de 1 uso restante e dois checkouts o
  finalizam ao mesmo tempo
- **THEN** exatamente um pedido recebe o desconto e o outro é criado sem o
  desconto do cupom

#### Scenario: Retry de checkout não consome uso extra
- **WHEN** a finalização falha após criar o pedido e o comprador re-tenta a
  finalização do mesmo checkout
- **THEN** o cupom permanece contabilizado como um único uso

### Requirement: Liberação de uso em cancelamento pré-pagamento
Quando um pedido que consumiu um cupom é cancelado antes da confirmação de
pagamento, o sistema SHALL devolver o uso ao cupom. Reembolso após pagamento
confirmado NÃO SHALL devolver o uso nesta entrega.

#### Scenario: Pedido cancelado antes de pagar
- **WHEN** um pedido com cupom é cancelado enquanto a cobrança ainda está
  pendente
- **THEN** o contador de usos do cupom é decrementado e o cliente pode usá-lo de
  novo dentro do teto

### Requirement: Acesso e auditoria
Cupons de dono `plataforma` SHALL ser gerenciáveis apenas por admin. Cupons de
dono `loja` SHALL ser gerenciáveis apenas pelo seller dono da `loja_id`. O
registro de uso de cupom SHALL ser legível por admin (todos) e por seller
(apenas usos de cupons da própria loja), e não SHALL ser editável por
comprador. Cada tabela nova nasce com RLS ativado e sem policy até a regra
correspondente ser implementada.

#### Scenario: Comprador não lê nem escreve cupom_usos
- **WHEN** um comprador tenta ler ou alterar diretamente a tabela de usos de
  cupom
- **THEN** o acesso é negado

#### Scenario: Admin lê o histórico de uso
- **WHEN** um admin consulta o histórico de uso de um cupom
- **THEN** ele vê a lista de pedidos que usaram o cupom

#### Scenario: Seller lê usos do próprio cupom de loja
- **WHEN** um seller consulta o histórico de uso de um cupom de loja que ele
  criou
- **THEN** ele vê a lista de pedidos que usaram esse cupom

#### Scenario: Seller não lê usos de cupom de plataforma
- **WHEN** um seller tenta consultar o histórico de uso de um cupom de dono
  `plataforma`
- **THEN** o acesso é negado

