## Purpose

Substitui o tour único de 7 passos, que só podia ser iniciado em Tutoriais, por tours curtos iniciados de dentro da própria tela, apresentados por um mascote. O seller aprende a tela em que já está, sem sair dela.

## ADDED Requirements

### Requirement: Tour iniciado na própria tela
O sistema SHALL oferecer, em cada tela do escopo, um gatilho de início de tour que apresenta apenas os passos daquela tela.

#### Scenario: Seller inicia o tour de Produtos
- **WHEN** o seller está em `/seller/produtos` e aciona o gatilho de tour
- **THEN** o tour percorre os passos da tela de Produtos e termina sem navegar para outra rota

#### Scenario: Tela sem tour definido
- **WHEN** o seller abre uma tela que ainda não tem passos cadastrados
- **THEN** nenhum gatilho de tour é exibido nessa tela

### Requirement: Convite na primeira visita
O sistema SHALL exibir um convite para iniciar o tour na primeira vez que o seller abre uma tela do escopo, e SHALL não repetir o convite depois que ele for dispensado ou o tour for concluído.

#### Scenario: Primeira visita
- **WHEN** o seller abre pela primeira vez uma tela do escopo
- **THEN** aparece o convite com o mascote, oferecendo iniciar o tour, com opção de dispensar

#### Scenario: Visitas seguintes
- **WHEN** o seller volta à mesma tela depois de dispensar ou concluir o tour
- **THEN** o convite não reaparece, e o tour continua disponível pelo gatilho da tela

#### Scenario: Preferência indisponível
- **WHEN** o armazenamento local do navegador está bloqueado ou vazio
- **THEN** a tela funciona normalmente e o convite simplesmente não é exibido, sem erro visível

### Requirement: Mascote restrito aos momentos de acolhimento
O sistema SHALL exibir a imagem do mascote apenas no balão do tour e no convite de primeira visita, e SHALL NOT exibi-la junto às dicas de campo.

#### Scenario: Uso repetido do formulário
- **WHEN** o seller usa diariamente o formulário de produto, com o tour já concluído
- **THEN** nenhuma imagem de mascote é renderizada na tela

### Requirement: Tour acessível e interrompível
O sistema SHALL permitir encerrar o tour a qualquer passo, e SHALL manter o balão dentro da área visível em telas estreitas.

#### Scenario: Tour em tela estreita
- **WHEN** o tour roda numa viewport de 390px
- **THEN** o balão permanece inteiramente visível e não empurra o conteúdo para fora da tela
