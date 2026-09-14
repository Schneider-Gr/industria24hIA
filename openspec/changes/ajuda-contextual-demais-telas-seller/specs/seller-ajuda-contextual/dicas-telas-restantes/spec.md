## Purpose

Estende a ajuda contextual do painel do seller para as telas que ficaram fora da primeira entrega, incluindo quatro que movimentam dinheiro (coletiva, leilão, mídia paga, crédito) e as telas de leitura, onde o que confunde não é um campo e sim um indicador.

## ADDED Requirements

### Requirement: Ajuda nos campos financeiros das telas restantes
O sistema SHALL exibir dica de texto fixo nos campos de lote e meta da compra coletiva, no preço e prazo do lance de leilão, no orçamento diário e na janela de datas da campanha de mídia paga, e no valor e prazo do pedido de crédito.

#### Scenario: Seller monta um lote de compra coletiva
- **WHEN** o seller preenche quantidade e preço de um lote
- **THEN** vê, junto aos campos, a regra de que todos os participantes pagam o preço do melhor lote atingido no fechamento, e que a conta precisa fechar depois da taxa da plataforma

#### Scenario: Seller dá lance num leilão
- **WHEN** o seller informa preço e prazo do lance
- **THEN** vê que o prazo declarado é compromisso de entrega, e que o lance concorre com outros sellers pelo mesmo pedido

#### Scenario: Seller define orçamento de campanha
- **WHEN** o seller informa o orçamento diário e a janela de datas
- **THEN** vê que o valor é gasto por dia enquanto a campanha estiver no ar, e o total que a janela implica

### Requirement: Ajuda em ações, não só em campos
O sistema SHALL exibir ajuda nos controles de ação que alteram estado com efeito de negócio: os botões da linha de produto, o campo inline de quantidade mínima, e o controle de status das telas de Afiliados e Parceiro logística.

#### Scenario: Seller aprova uma afiliação
- **WHEN** o seller muda o status de uma afiliação para aprovada
- **THEN** vê que, a partir dali, vendas pelo link daquele afiliado passam a descontar a comissão configurada no produto

#### Scenario: Seller altera a quantidade mínima direto na lista
- **WHEN** o seller edita a quantidade mínima na linha do produto
- **THEN** vê a mesma explicação do formulário de produto, sem precisar abrir a edição completa

### Requirement: Ajuda de indicador nas telas de leitura
O sistema SHALL exibir ajuda nos indicadores e colunas das telas sem formulário (Análise Geral, Reputação, Entregas, Transportadoras, Carrinhos abandonados), explicando como o número é apurado.

#### Scenario: Seller lê o faturamento do mês
- **WHEN** o seller abre Análise Geral
- **THEN** a ajuda do indicador diz qual data é usada na apuração, para ele não comparar com o próprio controle em outro regime

#### Scenario: Tela de leitura sem indicador ambíguo
- **WHEN** uma tela de leitura não tem indicador que gere dúvida registrada
- **THEN** nenhuma ajuda é adicionada, em vez de encher a tela de ícones

### Requirement: Interface divergente do manual fica registrada
O sistema SHALL descrever, na ajuda e no tópico correspondente da Central de Dúvidas, a interface real do painel quando ela divergir do Manual do Seller.

#### Scenario: Ícones de ação do manual não existem no painel
- **WHEN** o seller procura na Central de Dúvidas os seis ícones da lista de produtos descritos no manual
- **THEN** o tópico informa que esses ícones são do painel legado e que a lista atual usa botões de texto, com os nomes reais dos botões

### Requirement: Integridade estendida às novas telas
O sistema SHALL falhar na verificação automatizada quando um campo financeiro das novas telas estiver sem dica ou com peso diferente de fixo.

#### Scenario: Campo financeiro novo sem dica
- **WHEN** a suíte roda com o orçamento diário da campanha sem entrada na fonte de dicas
- **THEN** o teste falha apontando o campo
