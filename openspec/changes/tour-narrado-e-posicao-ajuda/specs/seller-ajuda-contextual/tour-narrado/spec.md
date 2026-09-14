## Purpose

Define como os elementos flutuantes de ajuda do painel do seller convivem na tela com o botão de Atendimento, como o convite do mascote se comporta ao longo das visitas, e como o seller ouve o tour em vez de lê-lo.

## ADDED Requirements

### Requirement: Elementos flutuantes nunca se cobrem
O sistema SHALL posicionar o botão de ajuda do mascote, o balão do tour e o botão de Atendimento sem sobreposição entre si, em qualquer largura de tela suportada pelo painel.

#### Scenario: Seller abre uma tela do painel no desktop
- **WHEN** a tela carrega com o botão de Atendimento presente
- **THEN** o mascote aparece acima dele, na mesma coluna da direita, com folga visível entre os dois
- **AND** nenhuma parte do mascote ou do seu balão fica atrás do botão de Atendimento

#### Scenario: Seller abre o chat de Atendimento
- **WHEN** o painel do chat se expande
- **THEN** o mascote e o seu balão continuam legíveis ou saem de cena por inteiro
- **AND** em nenhum momento o texto do convite aparece cortado por outro elemento

#### Scenario: Tela estreita de celular
- **WHEN** o painel é aberto a 390px de largura
- **THEN** o convite cabe na tela sem estourar a largura nem forçar rolagem horizontal
- **AND** continua sem cobrir o botão de Atendimento

### Requirement: Mascote reconhecível
O sistema SHALL exibir o mascote em tamanho que permita reconhecer o rosto sem ampliação, e com contraste suficiente contra o fundo da página.

#### Scenario: Seller vê o botão pela primeira vez
- **WHEN** o botão do mascote é renderizado
- **THEN** o rosto é distinguível à distância normal de leitura
- **AND** a borda do círculo separa o mascote do conteúdo da página em tema claro e escuro

### Requirement: Convite lê como fala do mascote
O sistema SHALL apresentar o convite da primeira visita com identidade visual própria, distinta do conteúdo da página.

#### Scenario: Convite aparece numa tabela de fundo claro
- **WHEN** o convite é exibido sobre a lista de pedidos
- **THEN** ele se distingue do fundo por cor de marca e sombra, não por uma borda fina apenas
- **AND** aponta visualmente para o mascote, deixando claro quem está falando
- **AND** o botão de fechar tem área de toque própria, sem encostar no texto

### Requirement: Convite persiste até ser fechado
O sistema SHALL manter o convite visível enquanto o seller não o fechar, e SHALL exibi-lo novamente em visitas posteriores.

#### Scenario: Seller ignora o convite e continua trabalhando
- **WHEN** o seller usa a tela sem clicar no convite nem no ✕
- **THEN** o convite permanece visível
- **AND** não desaparece por tempo decorrido nem por rolagem

#### Scenario: Seller fecha o convite
- **WHEN** o seller clica no ✕ daquela tela
- **THEN** o convite some naquela tela pelo resto da sessão do navegador
- **AND** volta a aparecer numa visita futura, depois que o navegador for fechado

#### Scenario: Seller abre o painel de ajuda pelo mascote
- **WHEN** o seller clica no mascote
- **THEN** o convite daquela tela é dado por atendido e some
- **AND** o painel de ajuda da tela abre no lugar dele

#### Scenario: Navegador sem armazenamento disponível
- **WHEN** `sessionStorage` está bloqueado ou indisponível
- **THEN** o convite continua aparecendo normalmente
- **AND** a interface não registra erro por causa disso

### Requirement: Balão do tour contido na janela
O sistema SHALL manter o balão do tour inteiramente dentro da área visível e fora da região ocupada pelos botões flutuantes.

#### Scenario: Passo ancorado num item baixo do menu
- **WHEN** o alvo do passo está próximo da borda inferior da janela
- **THEN** o balão se reposiciona para caber por inteiro
- **AND** não cobre o mascote nem o botão de Atendimento

#### Scenario: Passo sem alvo visível na tela
- **WHEN** o elemento ancorado não é encontrado
- **THEN** o balão assume uma posição de repouso que não colide com os botões flutuantes

### Requirement: Narração dos passos do tour
O sistema SHALL permitir que o seller ouça o texto do passo atual do tour em voz alta, usando a síntese de voz do próprio navegador, sem depender de arquivo de áudio ou serviço externo.

#### Scenario: Seller inicia a narração
- **WHEN** o seller aciona o controle de ouvir no balão do tour
- **THEN** o texto do passo atual é lido em voz alta em português
- **AND** o controle passa a oferecer parar a narração

#### Scenario: Seller avança de passo com a narração tocando
- **WHEN** o seller vai para o passo seguinte durante a leitura
- **THEN** a leitura do passo anterior é interrompida imediatamente
- **AND** nenhuma voz continua falando sobre um passo que saiu da tela

#### Scenario: Seller encerra o tour durante a narração
- **WHEN** o tour é fechado com a narração em andamento
- **THEN** a voz para imediatamente

#### Scenario: Navegador sem voz em português
- **WHEN** nenhuma voz utilizável em português está disponível no sistema
- **THEN** o controle de narração não é oferecido
- **AND** o tour continua funcionando normalmente em texto

#### Scenario: Seller sai da página com a narração tocando
- **WHEN** o seller navega para fora do painel durante a leitura
- **THEN** a voz para, sem continuar em segundo plano
