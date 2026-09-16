## Purpose

Tratar ruptura de estoque como estado do produto, e não como erro de checkout: o que não pode ser comprado sai da vitrine, o que só pode ser comprado por reserva é identificado como tal, e o seller é avisado antes de perder venda.

## ADDED Requirements

### Requirement: Vitrine só exibe produto vendável
O sistema SHALL exibir nas listagens públicas (home, busca, prévia de busca, categoria, página da loja, cross-sell do carrinho, galerias, proximidade e feed de produtos) apenas produtos `Aprovado`, de loja `Ativa`, com `valor > 0` e que tenham `estoque_atual > 0` **ou** ao menos uma oferta de venda futura com `estoque > 0`.

#### Scenario: Produto sem saldo e sem venda futura
- **WHEN** um produto aprovado está com `estoque_atual = 0` e não possui oferta de venda futura com saldo
- **THEN** ele não aparece em nenhuma listagem pública

#### Scenario: Produto sem saldo com venda futura ativa
- **WHEN** um produto aprovado está com `estoque_atual = 0` e possui oferta de venda futura com `estoque > 0`
- **THEN** ele continua aparecendo nas listagens públicas, identificado como reserva

#### Scenario: Reposição de estoque
- **WHEN** o seller repõe o saldo de um produto que estava oculto por ruptura
- **THEN** ele volta às listagens sem precisar de nova moderação ou republicação, e `status_produto` permanece `Aprovado`

### Requirement: Regra de vendabilidade tem definição única
O sistema SHALL derivar a vendabilidade de uma única definição no banco (view `produtos_vendaveis`), e as listagens públicas SHALL consultá-la em vez de repetir o filtro por consulta.

#### Scenario: Nova listagem pública é adicionada
- **WHEN** uma nova tela pública lista produtos a partir de `produtos_vendaveis`
- **THEN** ela herda o filtro de ruptura sem precisar repetir a condição

#### Scenario: Leitura fora da vitrine
- **WHEN** checkout, pedidos, disputas, painel do seller ou painel do admin leem produtos
- **THEN** continuam lendo a tabela `produtos`, sem o filtro de vitrine, porque precisam enxergar o produto em ruptura

### Requirement: Página do produto expõe o estado de estoque
O sistema SHALL manter a página pública do produto acessível mesmo em ruptura, e SHALL indicar explicitamente o estado em vez de oferecer compra que falhará.

#### Scenario: Produto em ruptura sem reserva
- **WHEN** um visitante abre a página de um produto com `estoque_atual = 0` e sem venda futura ativa
- **THEN** a página responde normalmente, o bloco de compra é substituído por aviso de indisponível, e o produto não é adicionável ao carrinho

#### Scenario: Produto em ruptura com reserva
- **WHEN** um visitante abre a página de um produto com `estoque_atual = 0` e com venda futura ativa
- **THEN** a reserva é apresentada como caminho de compra, com a previsão mais próxima

### Requirement: Carrinho revalida disponibilidade contra o banco
O sistema SHALL revalidar cada item do carrinho contra o saldo atual e a quantidade mínima ao exibir o carrinho e ao entrar no checkout, e SHALL NOT permitir finalizar com item pendente.

#### Scenario: Item esgotou depois de adicionado
- **WHEN** o carrinho contém um item cujo produto ficou sem saldo desde a adição
- **THEN** o item é marcado como indisponível, excluído do total, e o botão de finalizar fica bloqueado com o motivo ao lado do item

#### Scenario: Item indisponível com venda futura
- **WHEN** o item indisponível possui oferta de venda futura ativa
- **THEN** o carrinho informa a previsão e oferece a reserva como alternativa, sem trocar o item automaticamente

#### Scenario: Quantidade maior que o saldo
- **WHEN** a quantidade no carrinho excede o saldo disponível
- **THEN** o carrinho indica o disponível real e oferece ajustar a quantidade

#### Scenario: Saldo acaba entre a revisão e a finalização
- **WHEN** o saldo se esgota depois da revalidação e antes da RPC
- **THEN** a RPC continua sendo a barreira final e o erro é exibido apontando o item

### Requirement: Painel do seller separa esgotado de crítico
O sistema SHALL classificar cada produto do seller como esgotado (`estoque_atual <= 0`), crítico (`estoque_atual <= quantidade_minima`, ou `<= 5` quando não há quantidade mínima) ou normal, e SHALL exibir essa classificação na lista de produtos e no resumo do painel.

#### Scenario: Lista de produtos do seller
- **WHEN** o seller abre a lista de produtos
- **THEN** cada linha mostra o estado do estoque, e existe filtro por todos, crítico e esgotado

#### Scenario: Produto esgotado vendendo por reserva
- **WHEN** um produto esgotado possui venda futura ativa
- **THEN** a lista indica que ele continua na vitrine como reserva, e ele não é contado como perda de venda

#### Scenario: Resumo do painel
- **WHEN** o seller abre o painel
- **THEN** esgotados e críticos aparecem em contagens separadas, não somados num contador único

### Requirement: Tela do produto do seller avisa a ruptura
O sistema SHALL exibir, na edição do produto no painel do seller, o estado de estoque, se o produto está visível na vitrine e o que fazer para voltar.

#### Scenario: Produto oculto por ruptura
- **WHEN** o seller abre um produto com `estoque_atual = 0` e sem venda futura
- **THEN** vê aviso de que o produto está fora da vitrine, com as saídas: repor saldo ou criar oferta de venda futura

#### Scenario: Produto esgotado com reserva
- **WHEN** o seller abre um produto esgotado que tem venda futura ativa
- **THEN** vê que o produto segue na vitrine como reserva, com o saldo da reserva

### Requirement: Resumo diário de ruptura por e-mail ao seller
O sistema SHALL varrer o catálogo uma vez por dia e enviar, para cada loja com ao menos um produto esgotado ou crítico, um único e-mail listando os produtos, o saldo atual e o link de edição.

#### Scenario: Loja com produtos em ruptura
- **WHEN** a varredura encontra produtos esgotados ou críticos numa loja
- **THEN** a loja recebe um e-mail único, destacando separadamente os produtos que saíram da vitrine

#### Scenario: Loja sem ruptura
- **WHEN** a varredura não encontra produto esgotado nem crítico numa loja
- **THEN** nenhum e-mail é enviado para essa loja

#### Scenario: Estado inalterado no dia seguinte
- **WHEN** a varredura roda de novo e o estado do produto não mudou desde o último aviso
- **THEN** o produto não gera novo e-mail

#### Scenario: Falha de envio numa loja
- **WHEN** o envio falha para uma loja (sem e-mail cadastrado ou recusa do provedor)
- **THEN** a falha é registrada e a varredura segue para as demais lojas

#### Scenario: Varredura executada duas vezes no mesmo dia
- **WHEN** o cron dispara mais de uma vez no mesmo dia
- **THEN** o e-mail não é duplicado

### Requirement: Avisos de reserva por WhatsApp ao comprador e ao seller
O sistema SHALL avisar, por WhatsApp, o comprador e o seller de cada item comprado como venda futura em dois marcos: às vésperas da data combinada e no próprio dia.

#### Scenario: Faltam dois dias para a data da reserva
- **WHEN** a previsão da oferta cai na antecedência configurada a partir de hoje
- **THEN** o comprador recebe o aviso com produto, quantidade, data e link do pedido, e o seller recebe o aviso para separar a mercadoria

#### Scenario: Chegou o dia combinado
- **WHEN** a previsão da oferta é hoje
- **THEN** comprador e seller recebem o aviso do dia, cada um com a ação do seu lado

#### Scenario: Item já entregue
- **WHEN** o item da reserva já está marcado como entregue
- **THEN** nenhum aviso é enviado para ele

#### Scenario: Cron roda de novo no mesmo dia
- **WHEN** a varredura executa mais de uma vez
- **THEN** o mesmo item não recebe o mesmo marco duas vezes

#### Scenario: Falha no envio
- **WHEN** o envio falha para um destinatário (número ausente, aparelho desconectado)
- **THEN** a falha é registrada, os demais destinatários seguem recebendo, e o aviso continua elegível na próxima varredura

#### Scenario: Data calculada no fuso da operação
- **WHEN** a varredura roda em UTC depois das 20h de Manaus
- **THEN** "hoje" é o dia de Manaus, não o dia UTC
