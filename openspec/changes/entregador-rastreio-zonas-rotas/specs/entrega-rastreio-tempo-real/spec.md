# Rastreio da entrega em tempo real

## ADDED Requirements

### Requirement: Envio contínuo da posição pelo entregador

O sistema SHALL registrar a posição do entregador responsável pela corrida
(afiliado logístico ou parceiro logístico) de forma contínua enquanto a corrida
estiver em `Coletada` ou `EmTransito`.

#### Scenario: Afiliado logístico em trânsito

- **WHEN** o afiliado que aceitou a corrida está com a tela da corrida aberta e
  a corrida está em `EmTransito`
- **THEN** a posição é gravada no máximo a cada 20 segundos ou a cada 50 metros
  de deslocamento, o que vier primeiro

#### Scenario: Corrida fora de trânsito

- **WHEN** a corrida está em `Publicada`, `Aceita`, `Entregue` ou `Cancelada`
- **THEN** nenhuma posição é gravada, e uma tentativa de gravação é recusada
  pelo banco

#### Scenario: Usuário que não é o responsável

- **WHEN** um usuário que não é o parceiro nem o afiliado da corrida tenta
  gravar uma posição
- **THEN** a gravação é recusada

#### Scenario: GPS negado ou indisponível

- **WHEN** o navegador nega a permissão de localização
- **THEN** a tela avisa o entregador que o comprador não verá o trajeto, sem
  impedir a entrega

#### Scenario: Tela desligada no PWA

- **WHEN** o entregador bloqueia a tela e o navegador para de enviar posição
- **THEN** o envio retoma ao voltar para a tela, e nenhum ponto falso é gerado
  no intervalo

### Requirement: Comprador acompanha a entrega ao vivo

O sistema SHALL mostrar ao comprador, na página do pedido, a posição atual do
entregador, atualizada sem recarregar a página, e a estimativa de chegada.

#### Scenario: Corrida em trânsito

- **WHEN** o comprador abre o pedido e a corrida está em `EmTransito`
- **THEN** vê o mapa com a última posição do entregador, o destino e a
  estimativa de chegada, e o ponto se move a cada nova posição recebida

#### Scenario: Sem posição recente

- **WHEN** a última posição tem mais de 3 minutos
- **THEN** o mapa mostra "última atualização há N min" em vez de apresentar o
  ponto como ao vivo

#### Scenario: Corrida ainda não coletada

- **WHEN** a corrida está em `Publicada` ou `Aceita`
- **THEN** o comprador vê só o status em texto, sem mapa

#### Scenario: Pedido de outro comprador

- **WHEN** um usuário tenta ler posições de uma corrida cujo pedido não é dele
- **THEN** nenhuma posição é retornada

#### Scenario: Entrega confirmada

- **WHEN** a entrega é confirmada pelo código do comprador
- **THEN** o rastreio é encerrado e o comprador deixa de ver a posição do
  entregador

### Requirement: Confirmação por código encerra o rastreio

O sistema SHALL manter a confirmação por código de 4 dígitos do comprador como
condição obrigatória para concluir a entrega rastreada.

#### Scenario: Entregador chega ao destino

- **WHEN** o entregador informa o código correto do comprador
- **THEN** a entrega é confirmada, o repasse automático segue o fluxo
  existente e o envio de posição para

#### Scenario: Código errado

- **WHEN** o código informado está errado
- **THEN** a entrega não é confirmada, o rastreio continua e vale o limite de
  tentativas existente

### Requirement: App instalável do entregador

O sistema SHALL oferecer a área do entregador como aplicativo instalável (PWA)
que mantém a tela ligada durante a corrida em trânsito.

#### Scenario: Instalação

- **WHEN** o entregador abre a área logística no celular
- **THEN** o navegador oferece instalar o app, que abre direto na lista de
  corridas

#### Scenario: Corrida em trânsito com o app aberto

- **WHEN** a corrida está em `EmTransito` e o navegador suporta Wake Lock
- **THEN** a tela permanece ligada até a corrida sair desse status

#### Scenario: Navegador sem Wake Lock

- **WHEN** o navegador não suporta Wake Lock
- **THEN** a tela mostra o aviso para manter o app aberto e a tela ligada
