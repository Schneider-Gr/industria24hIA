## Purpose

Coloca a ajuda ao lado da configuração, no momento em que o seller preenche o campo, em vez de exigir que ele abra o manual em outra tela. Cobre primeiro os formulários em que um preenchimento errado custa dinheiro ou trava um pedido.

## ADDED Requirements

### Requirement: Dica ao lado de cada configuração
O sistema SHALL exibir uma dica associada a cada campo dos formulários de Produto, Minha Loja, Chave PIX, Venda Futura e faixa de desconto progressivo, a partir de uma fonte única indexada por tela e nome de campo.

#### Scenario: Campo com dica revisada
- **WHEN** o seller abre um formulário do escopo e o campo tem dica de origem `manual`
- **THEN** o sistema exibe o texto da dica junto ao campo, sem qualquer marcação de rascunho

#### Scenario: Campo sem dica cadastrada
- **WHEN** um campo do formulário não tem entrada na fonte de dicas
- **THEN** o campo é renderizado normalmente, sem espaço reservado nem ícone vazio

### Requirement: Peso da dica conforme o custo do erro
O sistema SHALL exibir como texto fixo abaixo do label as dicas marcadas com peso `fixa`, e como ícone acionável as demais. O peso `fixa` SHALL ser usado apenas em campo cujo preenchimento errado bloqueia recebimento, bloqueia checkout ou gera cobrança incorreta.

#### Scenario: Campo que trava recebimento
- **WHEN** o seller abre o formulário de chave PIX
- **THEN** a dica da chave aparece como texto fixo, sem exigir clique, avisando que sem chave válida o repasse fica inelegível

#### Scenario: Campo informativo
- **WHEN** o seller abre o formulário de produto e olha o campo SKU
- **THEN** a dica está disponível atrás de um ícone acionável, sem ocupar altura do formulário

### Requirement: Ajuda acessível sem hover
O sistema SHALL permitir abrir e fechar a dica acionável por toque e por teclado, sem depender de passar o mouse.

#### Scenario: Seller no celular
- **WHEN** o seller toca no ícone de dica numa viewport de 390px
- **THEN** o conteúdo da dica abre por inteiro dentro da tela, sem estourar a largura, e fecha num segundo toque ou no botão de fechar

#### Scenario: Navegação por teclado
- **WHEN** o usuário chega ao ícone de dica pelo Tab e aciona com Enter ou Espaço
- **THEN** a dica abre e seu conteúdo é anunciado por leitor de tela

### Requirement: Distinção entre texto revisado e rascunho
O sistema SHALL registrar a origem de cada dica (`manual` ou `rascunho`) e SHALL exibir marcação visível de conteúdo não revisado nas dicas de origem `rascunho`, até que a equipe as revise.

#### Scenario: Dica escrita a partir do comportamento do código
- **WHEN** o seller abre a dica de um campo que não existe no Manual do Seller, como `frete_gratis`
- **THEN** o texto aparece acompanhado de marcação indicando que é uma explicação preliminar sujeita a revisão

#### Scenario: Campo cujo comportamento não foi confirmado
- **WHEN** o comportamento de um campo não pôde ser confirmado no código, como a diferença entre `permite_logistica_afiliado` e `parceiro_logistico_habilitado`
- **THEN** nenhuma dica é publicada para esse campo, em vez de publicar uma explicação especulativa

### Requirement: Integridade da fonte de dicas
O sistema SHALL falhar na verificação automatizada quando um campo marcado como crítico estiver sem dica, ou quando uma dica de origem `rascunho` não carregar a marcação correspondente.

#### Scenario: Campo crítico sem dica
- **WHEN** a suíte de testes roda com um campo do caminho do dinheiro sem entrada na fonte de dicas
- **THEN** o teste falha e aponta qual campo está descoberto
