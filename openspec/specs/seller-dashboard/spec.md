# Seller Dashboard & Analytics Specification

## Purpose

Dá ao seller visão consolidada de vendas, catálogo e reputação da própria loja —
Dashboard (visão geral do mês), Análise Geral (histórico completo com repasse) e
Reputação (indicadores de qualidade de venda) — todas somente leitura.

## Requirements

### Requirement: Acesso restrito ao dono da loja
O sistema SHALL restringir Dashboard, Análise Geral e Reputação ao usuário
autenticado dono de uma loja (`lojas.owner_id = auth.uid()`).

#### Scenario: Usuário não autenticado
- **WHEN** um visitante sem sessão acessa `/seller`, `/seller/analise-geral` ou
  `/seller/reputacao`
- **THEN** o sistema exibe o estado "Precisa fazer login", sem consultar dados de
  nenhuma loja

#### Scenario: Usuário autenticado sem loja
- **WHEN** um usuário autenticado sem loja vinculada acessa qualquer uma das 3
  páginas
- **THEN** o sistema exibe o estado "Sem loja", sem consultar dados de pedidos

### Requirement: Dashboard resume o mês atual
O sistema SHALL exibir no Dashboard (`/seller`) o resumo do mês corrente da loja:
faturamento, ticket médio, vendas por dia, vendas por categoria e top produtos,
comparando com o mês anterior quando aplicável.

#### Scenario: Cálculo de datas no fuso de Manaus
- **WHEN** o sistema classifica um pedido como pertencente ao dia ou mês atual
- **THEN** usa o fuso horário `America/Manaus`, não UTC, para evitar que uma venda
  feita à noite em Manaus seja contada no dia seguinte

#### Scenario: Sem base de comparação no mês anterior
- **WHEN** o valor total do mês anterior é zero ou não existe
- **THEN** a variação percentual não é calculada; a UI exibe "sem base no mês
  anterior" em vez de um percentual

#### Scenario: Sem vendas no mês atual
- **WHEN** não há nenhum pedido no mês corrente
- **THEN** as seções "Análise do mês", "Vendas por categoria" e "Top Produtos"
  exibem estado vazio, cada uma de forma independente

### Requirement: Card "Precisa de você" sinaliza pendências acionáveis
O sistema SHALL exibir um card de pendências no Dashboard apontando para pedidos
aguardando pagamento, produtos sem estoque e afiliações pendentes de aprovação,
cada item linkando para a tela correspondente.

#### Scenario: Nenhuma pendência
- **WHEN** não há pedido aguardando pagamento, produto sem estoque nem afiliação
  pendente
- **THEN** o card "Precisa de você" não é exibido

#### Scenario: Pendência de pagamento sem status de despacho dedicado
- **WHEN** o sistema precisa identificar pedidos que ainda dependem de ação do
  seller
- **THEN** usa como proxy o `status_pedido` contendo "aguardando" (case-insensitive),
  já que não existe uma coluna de status de despacho dedicada

### Requirement: Análise Geral mostra histórico completo com repasse
O sistema SHALL exibir em Análise Geral (`/seller/analise-geral`) o histórico
completo de vendas da loja (sem filtro de data), incluindo repasse por linha de
pedido e top 5 produtos de todo o histórico.

#### Scenario: Sem vendas registradas
- **WHEN** a loja nunca teve nenhuma venda
- **THEN** a tabela "Vendas Geral" é substituída por um estado vazio "Nenhuma venda
  registrada ainda."

#### Scenario: Sem top produtos
- **WHEN** não há produtos suficientes para compor o ranking
- **THEN** a seção de top produtos inteira não é renderizada

### Requirement: Reputação calcula indicadores com limites de referência
O sistema SHALL calcular, em Reputação (`/seller/reputacao`), os percentuais de
cancelamento, reclamação e envio incorreto da loja, exibindo o limite de referência
de cada indicador junto ao valor calculado.

#### Scenario: Loja sem nenhum pedido
- **WHEN** a loja não tem nenhum pedido registrado
- **THEN** todos os percentuais (cancelamento, reclamação, envio incorreto) são
  calculados como 0, evitando divisão por zero

#### Scenario: Loja sem entregas registradas
- **WHEN** não há nenhuma entrega vinculada aos pedidos da loja
- **THEN** o percentual de envio incorreto é calculado como 0, e o texto de rodapé
  não menciona entregas

#### Scenario: Indicador acima do limite de referência
- **WHEN** um percentual calculado ultrapassa o limite de referência exibido
- **THEN** o sistema apenas exibe o valor e o limite lado a lado como texto
  informativo — não há alerta visual ou bloqueio adicional no comportamento atual
