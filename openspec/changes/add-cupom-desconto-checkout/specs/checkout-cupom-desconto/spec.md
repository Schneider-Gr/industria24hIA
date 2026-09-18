## Purpose

Permite criar cupons de desconto — pela plataforma (admin) ou pelo seller — com
regras heterogêneas por cesta de produtos, aplicá-los no checkout com cálculo
autoritativo no servidor, e distribuir o custo do desconto entre lojista e
plataforma conforme quem criou o cupom, sem nunca reduzir a comissão do afiliado.

## ADDED Requirements

### Requirement: Cadastro de cupom com dono e escopo derivado
O sistema SHALL registrar cada cupom com um código textual único (case-insensitive),
um dono que é `plataforma` quando o cupom é criado por um admin ou `loja` (com a
loja de origem) quando criado por um seller, uma janela de validade com início e
fim, um valor mínimo de pedido opcional, um teto de usos global opcional e um
teto de usos por cliente com valor padrão 1. O escopo do cupom SHALL ser derivado
do dono: cupom de `loja` só é elegível para itens da loja de origem; cupom de
`plataforma` é elegível para itens de qualquer loja.

#### Scenario: Admin cria cupom de plataforma
- **WHEN** um admin cria um cupom informando código, validade e regras
- **THEN** o cupom é salvo com dono `plataforma` e passa a ser elegível para
  itens de qualquer loja durante a janela de validade

#### Scenario: Seller cria cupom da própria loja
- **WHEN** um seller cria um cupom no painel da própria loja
- **THEN** o cupom é salvo com dono `loja` vinculado à loja do seller e só é
  elegível para itens dessa loja

#### Scenario: Código duplicado é rejeitado
- **WHEN** alguém tenta criar um cupom com um código que já existe, em qualquer
  escopo, diferenciando apenas maiúsculas/minúsculas
- **THEN** a criação é rejeitada e nenhum cupom é gravado

#### Scenario: Seller não cria cupom de plataforma
- **WHEN** um seller tenta criar um cupom com dono `plataforma` ou vinculado a
  outra loja
- **THEN** a operação é negada

### Requirement: Regras de desconto por alvo
Um cupom SHALL conter uma ou mais regras, cada uma com um alvo (`produto`,
`categoria`, `loja` ou `tudo`), um tipo (`percentual` ou `valor_fixo`) e um valor
positivo. Para cada item do carrinho, o sistema SHALL selecionar a regra
aplicável de alvo mais específico na ordem `produto` > `categoria` > `loja` >
`tudo`; se nenhuma regra casar, o item não recebe desconto do cupom. Regra de
tipo `percentual` SHALL ter valor entre 0 e 100 exclusive-inclusive conforme a
validação de cadastro; regra de `valor_fixo` SHALL ser interpretada como
desconto por unidade do item, limitado ao preço unitário vigente.

#### Scenario: Cupom com descontos diferentes por produto
- **WHEN** um cupom tem regra de 15% para o produto A e regra de R$50 por unidade
  para o produto B, e o carrinho contém A e B
- **THEN** o item A recebe 15% de desconto e o item B recebe R$50 por unidade,
  ambos sob o mesmo código

#### Scenario: Precedência de regra mais específica
- **WHEN** um cupom tem regra `tudo` de 5% e regra `produto` de 20% para o
  produto X, e o carrinho contém X
- **THEN** o item X recebe 20% (regra de produto vence a regra `tudo`)

#### Scenario: Desconto fixo não deixa o item negativo
- **WHEN** uma regra de `valor_fixo` tem valor maior que o preço unitário vigente
  do item
- **THEN** o desconto aplicado ao item é no máximo o preço unitário vigente, sem
  gerar valor negativo

### Requirement: Não acumulação com desconto progressivo e coletiva
Para cada item, o sistema SHALL comparar o preço unitário resultante da faixa de
desconto progressivo vigente (quando houver) com o preço unitário resultante do
cupom aplicado sobre o preço base, e SHALL aplicar apenas o menor dos dois. O
sistema NÃO SHALL somar os dois descontos.

#### Scenario: Progressivo é melhor que o cupom
- **WHEN** um item tem faixa progressiva que resulta em preço unitário R$80 e o
  cupom resultaria em R$85
- **THEN** o item é cobrado a R$80 e o cupom não afeta esse item

#### Scenario: Cupom é melhor que o progressivo
- **WHEN** um item tem faixa progressiva que resulta em R$90 e o cupom resultaria
  em R$75
- **THEN** o item é cobrado a R$75 e a faixa progressiva não é aplicada a esse
  item

#### Scenario: Item de preço cheio
- **WHEN** um item não tem faixa progressiva ativa e casa com uma regra do cupom
- **THEN** o cupom é aplicado sobre o preço base do item

### Requirement: Custeio do desconto por dono do cupom
O sistema SHALL debitar o valor do desconto de cada item do repasse do
responsável pelo custeio: `repasse_vendedor` quando o cupom é de dono `loja`,
`repasse_ind` (plataforma) quando o cupom é de dono `plataforma`. O sistema NÃO
SHALL reduzir `repasse_afiliado` em nenhum caso. O valor líquido gravado na linha
do pedido e no total do pedido SHALL já refletir o desconto.

#### Scenario: Cupom de seller reduz o repasse do vendedor
- **WHEN** um cupom de dono `loja` concede R$30 de desconto a um item
- **THEN** o `repasse_vendedor` daquele item é reduzido em R$30 e os repasses de
  plataforma e afiliado permanecem inalterados

#### Scenario: Cupom de plataforma reduz o repasse da plataforma
- **WHEN** um cupom de dono `plataforma` concede R$30 de desconto a um item
- **THEN** o `repasse_ind` daquele item é reduzido em R$30 e os repasses de
  vendedor e afiliado permanecem inalterados

#### Scenario: Comissão do afiliado é preservada
- **WHEN** um item tem afiliado vinculado e recebe desconto de cupom
- **THEN** o `repasse_afiliado` calculado para o item é o mesmo que seria sem o
  cupom

### Requirement: Piso de repasse
Se o desconto calculado para um item exceder o repasse disponível de quem o
custeia — para cupom de plataforma, o `repasse_ind` do item após reservar
integralmente o `repasse_afiliado` — o cupom NÃO SHALL ser aplicado àquele item.
Os demais itens do carrinho seguem sendo avaliados normalmente.

#### Scenario: Desconto de plataforma maior que a margem da plataforma
- **WHEN** um cupom de plataforma concederia R$40 de desconto a um item cujo
  `repasse_ind`, após reservar o `repasse_afiliado`, é R$25
- **THEN** o item não recebe desconto do cupom e o restante do carrinho continua
  elegível

#### Scenario: Desconto de seller maior que o repasse do vendedor
- **WHEN** um cupom de loja concederia R$120 de desconto a um item cujo
  `repasse_vendedor` é R$100
- **THEN** o item não recebe desconto do cupom

### Requirement: Rateio de cupom de plataforma em checkout multiloja
Quando um checkout gera pedidos separados por loja e um cupom de dono
`plataforma` é aplicado, o sistema SHALL avaliar as regras do cupom contra os
itens de cada pedido independentemente. O teto de usos SHALL contar o checkout
como um único uso do cupom, ainda que gere múltiplos pedidos.

#### Scenario: Cupom global em carrinho de duas lojas
- **WHEN** o carrinho tem itens da loja 1 e da loja 2, gera dois pedidos, e um
  cupom de plataforma de 10% em `tudo` é aplicado
- **THEN** cada pedido recebe 10% de desconto nos seus próprios itens, debitado
  do `repasse_ind`, e o cupom conta como um uso

#### Scenario: Cupom de loja não cruza pedidos
- **WHEN** o carrinho tem itens de duas lojas e um cupom de dono `loja 1` é
  aplicado
- **THEN** apenas o pedido da loja 1 recebe desconto; o pedido da loja 2 é criado
  sem desconto

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
cliente. O pedido SHALL ser gravado com o valor líquido, os repasses ajustados e
o vínculo do cupom em cada linha afetada. A cobrança do gateway de pagamento
SHALL ser criada sobre o valor já líquido.

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
  finalização do mesmo pedido
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
Cupons de plataforma SHALL ser gerenciáveis apenas por admin; cupons de loja
apenas pelo seller dono da loja. O registro de uso de cupom SHALL ser legível por
admin e pelo seller dono do cupom, e não SHALL ser editável por comprador. Cada
tabela nova nasce com RLS ativado e sem policy até a regra correspondente ser
implementada.

#### Scenario: Seller lê usos do próprio cupom
- **WHEN** um seller consulta o histórico de uso de um cupom que ele criou
- **THEN** ele vê a lista de pedidos que usaram o cupom da própria loja

#### Scenario: Seller não vê cupom de outra loja
- **WHEN** um seller tenta ler ou editar um cupom cujo dono é outra loja ou a
  plataforma
- **THEN** o acesso é negado
