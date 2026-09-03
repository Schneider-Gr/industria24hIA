# admin-dashboard-kpis Specification

## Purpose
Dar ao admin uma visão gerencial do marketplace com período selecionável e comparativo com o período anterior, para que o painel continue útil em meses sem venda e cubra métricas de conversão, devolução e geração de leads.
## Requirements
### Requirement: Período do dashboard é selecionável
O sistema SHALL oferecer no dashboard do admin um seletor de período com as opções `últimos 30 dias`, `últimos 90 dias`, `mês corrente` e `tudo`, aplicando a janela escolhida a todos os KPIs financeiros, à tabela de vendas e ao Top lojas. A opção padrão SHALL ser `últimos 30 dias`.

#### Scenario: Acesso sem parâmetro de período
- **WHEN** o admin abre `/admin` sem `?range`
- **THEN** o dashboard usa a janela de 30 dias e destaca a aba "30 dias"

#### Scenario: Troca de período
- **WHEN** o admin seleciona "90 dias"
- **THEN** os KPIs, a tabela de vendas e o Top lojas recalculam sobre `data >= now() - 90 dias`, e a paginação da tabela recomeça preservando `range=90d`

#### Scenario: Mês corrente sem vendas
- **WHEN** não há nenhum pedido no mês corrente e o admin seleciona "mês corrente"
- **THEN** os cards financeiros mostram zero e a tabela mostra "Nenhuma venda no período selecionado", sem erro

### Requirement: KPIs financeiros somam todos os pedidos da janela
O sistema SHALL calcular "Valor do período" (Σ `valor_pedido`), "Produtos vendidos" (Σ `linha_itens.quantidade`) e "Receita da plataforma" (Σ `linha_itens.repasse_ind`) sobre todos os pedidos da janela, independentemente do `status_pedido`.

#### Scenario: Janela com pedidos pagos e não pagos
- **WHEN** a janela contém pedidos "Pagamento Realizado" e "Aguardando Pagamento"
- **THEN** "Valor do período" e "Receita da plataforma" incluem os dois grupos

### Requirement: Comparativo com o período anterior
O sistema SHALL exibir em cada KPI financeiro a variação percentual contra a janela imediatamente anterior de mesma duração, indicando direção (alta / baixa / estável). Para a opção `tudo` o comparativo SHALL ser omitido.

#### Scenario: 30 dias com período anterior não vazio
- **WHEN** a janela de 30 dias tem GMV maior que os 30 dias anteriores
- **THEN** o card "Valor do período" mostra um selo de alta com o percentual e um `aria-label` descritivo

#### Scenario: Período anterior sem dados
- **WHEN** a janela anterior tem GMV zero
- **THEN** o card não mostra percentual (evita divisão por zero), exibindo estado neutro

#### Scenario: Período "tudo"
- **WHEN** o admin seleciona "tudo"
- **THEN** nenhum selo de comparativo é exibido

### Requirement: Ticket médio e taxa de conversão de pagamento
O sistema SHALL exibir "Ticket médio" (GMV da janela ÷ nº de pedidos da janela) e "Taxa de conversão de pagamento" (% de pedidos da janela com `status_pedido = 'Pagamento Realizado'`).

#### Scenario: Janela sem pedidos
- **WHEN** a janela não tem pedidos
- **THEN** "Ticket médio" mostra R$ 0,00 e "Taxa de conversão" mostra 0%, sem erro de divisão por zero

### Requirement: GMV a receber
O sistema SHALL exibir "GMV a receber" como a soma de `valor_pedido` dos pedidos da janela com `status_pedido = 'Aguardando Pagamento'`.

#### Scenario: Janela com pedidos aguardando pagamento
- **WHEN** a janela tem pedidos "Aguardando Pagamento" somando R$ 83.706,32
- **THEN** o card "GMV a receber" mostra R$ 83.706,32

### Requirement: Devoluções da janela
O sistema SHALL exibir "Devoluções" como o número de `disputas` com `decisao IN ('reembolso_total','reembolso_parcial')` e `decidida_em` dentro da janela, com a soma de `decisao_valor` como detalhe.

#### Scenario: Janela sem devoluções decididas
- **WHEN** nenhuma disputa com decisão de reembolso foi decidida na janela
- **THEN** o card mostra 0 e R$ 0,00

### Requirement: Novos leads do CRM na janela
O sistema SHALL exibir "Novos leads (CRM)" como o número de registros em `leads` com `created_at` dentro da janela, com link para `/admin/leads`.

#### Scenario: Leads criados na janela
- **WHEN** 6 leads foram criados dentro da janela
- **THEN** o card mostra 6 e leva a `/admin/leads` ao ser clicado

### Requirement: Fila de curadoria não depende do período
O sistema SHALL manter os contadores "lojas em análise", "produtos a aprovar", "afiliações pendentes" e "entregas em trânsito" como estado corrente absoluto, sem aplicar a janela de período.

#### Scenario: Período de 30 dias selecionado
- **WHEN** o admin está com "30 dias" selecionado
- **THEN** "produtos a aprovar" continua contando todos os produtos `Pendente`, mesmo os criados há mais de 30 dias

