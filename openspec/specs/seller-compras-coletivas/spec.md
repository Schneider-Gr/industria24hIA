# Seller Compras Coletivas Specification

## Purpose

Permite ao seller configurar e gerenciar o ciclo de vida de compras coletivas por
produto: curva de desconto progressivo por lote, meta de quantidade agregada,
prazo, mínimo de participantes e frete conjunto — com apoio opcional de IA para
sugerir a regra, e fechamento/cancelamento manuais além da varredura automática.

## Requirements

### Requirement: Regra de coletiva por produto
O sistema SHALL permitir configurar, por produto, uma curva de lotes (quantidade
mínima crescente, preço unitário decrescente), meta de quantidade agregada, prazo
em dias, mínimo e máximo de participantes, e se o frete é rateado conjuntamente.

#### Scenario: Meta não informada
- **WHEN** a meta de quantidade não é preenchida
- **THEN** o sistema usa a quantidade do primeiro lote como meta

#### Scenario: Validação da curva
- **WHEN** a curva de lotes é salva
- **THEN** o sistema valida no banco que há no máximo 4 lotes, quantidade
  estritamente crescente, preço estritamente decrescente, todo lote abaixo do
  preço base, e nenhum lote com desconto maior que 30% sobre o preço base

#### Scenario: Meta acima do estoque disponível
- **WHEN** a meta de quantidade configurada excede o estoque atual do produto
- **THEN** a configuração é rejeitada

### Requirement: Preço aplicado segue o melhor lote já atingido
O sistema SHALL aplicar, a cada participante, o preço do lote de maior quantidade
mínima já atingido pela quantidade agregada da coletiva no momento do fechamento —
nunca um preço acima do que a curva garante.

#### Scenario: Nenhum lote atingido
- **WHEN** a quantidade agregada não atinge o primeiro lote
- **THEN** o preço aplicado é o preço base do produto

### Requirement: Viabilidade da coletiva
O sistema SHALL considerar uma coletiva viável apenas quando a quantidade agregada
atinge a meta, o número de participações atinge o mínimo configurado, e o valor
total atinge o valor mínimo de pedido da loja.

#### Scenario: Todos os critérios atendidos
- **WHEN** a quantidade agregada atinge a meta, o número de participações atinge o
  mínimo configurado, e o valor total atinge o valor mínimo de pedido da loja
- **THEN** a coletiva é considerada viável

### Requirement: Fechamento da coletiva com rateio exato
O sistema SHALL, ao fechar uma coletiva viável, cobrar cada participante pelo
preço do melhor lote atingido multiplicado pela sua quantidade, atribuindo a sobra
de centavos do total (e do frete rateado, quando conjunto) ao maior participante,
de forma que a soma feche exatamente com o total.

#### Scenario: Fechamento repetido (idempotência)
- **WHEN** o fechamento de uma coletiva já fechada é chamado novamente (pela
  varredura automática, pela leitura de página ou por ação manual)
- **THEN** a operação não duplica efeito nem altera o estado já consolidado

#### Scenario: Fechamento manual forçado pelo seller dono da loja
- **WHEN** o seller dono da loja aciona o fechamento manual de uma coletiva viável
- **THEN** o sistema força o fechamento mesmo sem os demais gatilhos automáticos
  (prazo vencido, teto de participantes, último lote atingido) terem ocorrido

#### Scenario: Fechamento manual por quem não é dono da loja
- **WHEN** um usuário que não é dono da loja da coletiva tenta forçar o fechamento
- **THEN** a operação é rejeitada

### Requirement: Fechamento automático por prazo, teto ou último lote
O sistema SHALL fechar ou expirar automaticamente uma coletiva quando o prazo
vence, quando o teto de participantes é atingido, ou quando o último lote da
curva é alcançado — sem exigir ação manual do seller.

#### Scenario: Coletiva não viável ao vencer o prazo
- **WHEN** o prazo de uma coletiva vence sem que ela tenha atingido viabilidade
- **THEN** a coletiva é marcada como expirada

### Requirement: Cancelamento pelo dono da loja
O sistema SHALL permitir que apenas o dono da loja cancele uma coletiva ainda
aberta ou viável, e nunca depois que já foi atingida, expirada ou já cancelada.

#### Scenario: Cancelamento de coletiva já atingida
- **WHEN** o dono da loja tenta cancelar uma coletiva já com status "Atingida"
- **THEN** a operação é rejeitada — a coletiva já teve participantes cobrados

### Requirement: Expiração de pagamentos vencidos sem afetar quem já pagou
O sistema SHALL, para uma coletiva já atingida cuja janela de pagamento venceu,
cancelar apenas os pedidos ainda não pagos e devolver o estoque correspondente,
sem tocar nos pedidos de quem já pagou.

#### Scenario: Coletiva ainda não fechada
- **WHEN** a expiração de pagamentos é acionada para uma coletiva que não está com
  status "Atingida"
- **THEN** a operação não cancela nada e informa o motivo

#### Scenario: Janela de pagamento ainda aberta
- **WHEN** a janela de pagamento de uma coletiva atingida ainda não venceu
- **THEN** a operação não cancela nenhum pedido

### Requirement: Sugestão de regra por IA validada deterministicamente
O sistema SHALL oferecer uma sugestão de IA para a regra de coletiva (lotes, meta,
prazo, participantes), validada por um verificador determinístico que espelha
exatamente as mesmas regras aplicadas pelo banco de dados — corrigindo a sugestão
automaticamente até 3 tentativas antes de reportar falha ao seller.

#### Scenario: IA excede o número máximo de tentativas de correção
- **WHEN** a sugestão da IA continua inválida após as tentativas de correção
  automática
- **THEN** o sistema reporta os erros de validação ao seller em vez de aplicar uma
  sugestão inválida

#### Scenario: Sugestão calibrada pelo giro real do produto
- **WHEN** a IA monta a sugestão
- **THEN** usa como contexto o preço base, estoque atual, vendas e pedidos dos
  últimos 90 dias, quantidade média por pedido e coletivas anteriores do mesmo
  produto — nunca dados de outros produtos ou da plataforma inteira

#### Scenario: IA não configurada
- **WHEN** a chave de API de IA não está configurada
- **THEN** a sugestão retorna erro sem chamar o modelo, sem impedir o cadastro
  manual da regra

### Requirement: Varredura automática de etapas da coletiva
O sistema SHALL varrer periodicamente as coletivas abertas ou viáveis, avaliando
transição de status, redigindo comunicação da próxima etapa e publicando eventos
num mural — sem alterar valores numéricos calculados deterministicamente.

#### Scenario: Redação de comunicação sem IA disponível
- **WHEN** a chave de API de IA não está configurada durante a varredura
- **THEN** o sistema usa um texto fixo determinístico para comunicar a etapa, sem
  interromper o fluxo de fechamento/eventos

#### Scenario: Comunicação nunca altera os números
- **WHEN** a IA redige a comunicação de uma etapa
- **THEN** usa exatamente os números já calculados deterministicamente, sem
  reinterpretar ou arredondar por conta própria
