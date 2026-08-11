## Purpose

Define o comportamento observável da sessão de checkout PIX unificada: o comprador informa seus dados uma única vez, acompanha o progresso da geração da cobrança e, em caso de falha, se recupera sem repetir dados nem perder o pedido.

## ADDED Requirements

### Requirement: Coleta única de dados de identificação do comprador
O sistema SHALL coletar nome completo, CPF/CNPJ e WhatsApp do comprador uma única vez por sessão de checkout. Esses dados SHALL ser reutilizados para criar/localizar o cliente no gateway de pagamento e gerar a cobrança PIX, sem exigir novo preenchimento em nenhuma tela subsequente da mesma compra.

#### Scenario: Comprador completa o checkout sem repetir dados
- **WHEN** o comprador preenche nome, CPF/CNPJ e WhatsApp no formulário de checkout e confirma o pedido
- **THEN** o sistema não exibe nenhum novo formulário pedindo esses mesmos dados durante a geração da cobrança PIX, mesmo que a geração automática inicial não tenha concluído de imediato

#### Scenario: Comprador já possui cliente cadastrado no gateway de pagamento
- **WHEN** o comprador confirma um novo pedido e já existe um registro de cliente do gateway de pagamento vinculado à sua conta de uma compra anterior
- **THEN** o sistema reutiliza o cliente existente para gerar a cobrança, sem exigir que o comprador reinforme nome ou CPF/CNPJ

### Requirement: Progresso visível durante a geração da cobrança PIX
O sistema SHALL exibir um estado de progresso perceptível ao comprador entre a confirmação do pedido e a exibição do resultado da geração da cobrança (sucesso ou falha). Este estado SHALL ser o comportamento padrão do fluxo, não condicionado a uma falha prévia da geração automática.

#### Scenario: Geração de cobrança em andamento
- **WHEN** o comprador confirma o pedido e o sistema inicia a geração da cobrança PIX
- **THEN** o comprador vê um indicador de que a cobrança está sendo processada, visível até que o resultado (QR/link ou erro tratado) esteja disponível

#### Scenario: Geração de cobrança conclui rapidamente
- **WHEN** a geração da cobrança PIX é concluída com sucesso em menos de 300ms após a confirmação do pedido
- **THEN** o estado de progresso ainda assim é perceptível ao comprador antes da transição para a exibição do QR code, evitando uma troca de tela abrupta e não percebida

### Requirement: Recuperação de falha sem repetição de dados ou perda do pedido
Quando a geração da cobrança PIX falhar de forma tratada, o sistema SHALL exibir uma tela de recuperação específica com a opção de tentar novamente, reutilizando os dados de identificação já informados e sem afetar a existência do pedido já criado.

#### Scenario: Falha tratada na geração da cobrança
- **WHEN** a tentativa de gerar a cobrança PIX falha de forma tratada (erro do gateway de pagamento ou expiração do tempo limite)
- **THEN** o sistema exibe uma tela de erro específica com um botão "Tentar novamente", sem solicitar novamente nome, CPF/CNPJ ou WhatsApp, e o pedido permanece visível em "Meus Pedidos" com status aguardando pagamento

#### Scenario: Comprador tenta novamente após falha
- **WHEN** o comprador aciona "Tentar novamente" na tela de recuperação
- **THEN** o sistema reinicia a geração da cobrança PIX usando os dados já coletados, exibindo novamente o estado de progresso, sem exigir novo preenchimento de formulário

#### Scenario: Comprador retorna mais tarde após uma falha
- **WHEN** o comprador fecha a sessão de checkout após uma falha tratada e acessa o pedido novamente mais tarde pela lista de pedidos
- **THEN** o sistema exibe a mesma tela de recuperação com a opção de tentar novamente, sem exigir que o comprador refaça o checkout desde o início

### Requirement: Formulário de recuperação manual como caminho de exceção
O sistema SHALL restringir a exibição de um formulário de identificação do comprador na página do pedido apenas ao cenário de recuperação após falha tratada, e não a todo pedido sem cobrança gerada.

#### Scenario: Pedido aguardando geração de cobrança sem falha registrada
- **WHEN** um pedido está com status aguardando pagamento e a geração da cobrança PIX ainda está em andamento (sem falha registrada)
- **THEN** o sistema não exibe o formulário de identificação do comprador; exibe o estado de progresso correspondente
