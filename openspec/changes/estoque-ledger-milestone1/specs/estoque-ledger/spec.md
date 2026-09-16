## Purpose

Substitui o saldo escalar de estoque por um livro de movimentações imutável como
registro auditável de toda alteração, mantendo `produtos.estoque_atual` em
paridade permanente, para que toda alteração de estoque tenha origem e motivo
rastreáveis e o
marketplace possa responder por mercadoria de terceiro guardada em seu centro de
distribuição. Esta capability cobre o registro e a derivação do saldo; a reserva
no pedido e a escolha de origem por local são definidas em specs próprias.

## ADDED Requirements

### Requirement: Lançamento como registro completo e imutável
Toda alteração de estoque SHALL ser registrada como um lançamento contendo
produto, local, quantidade com sinal, tipo, origem, motivo, autor quando houver
usuário autenticado, e data de criação. Os tipos SHALL ser: entrada, saída,
ajuste e transferência. A origem SHALL identificar o que produziu o lançamento
(checkout, ajuste do seller, migração ou rotina de sistema) e é sempre
obrigatória; o autor é obrigatório apenas quando existe usuário autenticado,
porque migração e rotina de sistema não têm autor humano e preencher a coluna
com um identificador inventado seria dado falso. Um lançamento gravado
SHALL ser imutável: o sistema SHALL rejeitar qualquer alteração ou remoção de
lançamento existente, inclusive por perfil administrativo. Correção de erro
SHALL ser feita por um novo lançamento de sentido contrário.

#### Scenario: Lançamento sem motivo
- **WHEN** um lançamento é gravado sem motivo preenchido
- **THEN** a gravação é rejeitada e o saldo permanece inalterado

#### Scenario: Lançamento sem origem
- **WHEN** um lançamento é gravado sem origem, ou com origem fora da lista
  prevista
- **THEN** a gravação é rejeitada

#### Scenario: Lançamento da migração, sem usuário autenticado
- **WHEN** a migração grava o saldo inicial, sem usuário autenticado no contexto
- **THEN** o lançamento é aceito com origem de migração e sem autor, em vez de
  receber um identificador inventado

#### Scenario: Tentativa de alterar lançamento existente
- **WHEN** qualquer perfil tenta alterar ou remover um lançamento já gravado
- **THEN** a operação é rejeitada pelo banco, e não apenas pela aplicação

#### Scenario: Correção de lançamento errado
- **WHEN** um lançamento de 100 unidades foi gravado por engano e precisa ser
  desfeito
- **THEN** um lançamento contrário de 100 unidades é gravado com motivo próprio,
  e ambos permanecem visíveis no histórico

### Requirement: Saldo como soma dos lançamentos
O saldo de um produto num local SHALL ser igual à soma das quantidades dos
lançamentos daquele produto naquele local. O saldo SHALL ser mantido
materializado, não recalculado a cada leitura, para que a listagem da vitrine não
pague o custo da soma do histórico. O sistema SHALL rejeitar qualquer lançamento
cujo resultado deixaria o saldo do local negativo.

#### Scenario: Lançamento levaria o saldo a negativo
- **WHEN** um lançamento de saída de 10 unidades é gravado num local com saldo 4
- **THEN** a gravação é rejeitada, e a mensagem informa o saldo disponível real

#### Scenario: Duas escritas concorrentes sobre o mesmo produto e local
- **WHEN** duas operações tentam simultaneamente consumir a última unidade
  disponível de um produto num local
- **THEN** uma tem sucesso, a outra é rejeitada, e o saldo final é zero, nunca
  negativo

#### Scenario: Saldo reconstruído a partir do histórico
- **WHEN** o saldo materializado de um produto é recalculado a partir da soma dos
  seus lançamentos
- **THEN** o valor recalculado é idêntico ao materializado

### Requirement: Local como dono do saldo
Todo saldo SHALL pertencer a um local de estoque, e todo local SHALL pertencer a
uma loja. O local de estoque SHALL ser o **centro de distribuição já existente**
(`centros_distribuicao`), estendido, e não uma entidade paralela: o vínculo
produto/centro já modelado em `produto_centros` e a origem já registrada em
`linha_itens.centro_id`, que é por **item** de pedido, continuam valendo e passam
a ter saldo. Todo
local SHALL declarar seu tipo: `seller`, quando é centro de distribuição do
próprio seller, ou `industria`, quando é operado pelo marketplace. Toda loja
SHALL ter exatamente um local marcado como padrão, usado quando nenhum outro é
indicado.

#### Scenario: Produto movimentado sem local indicado
- **WHEN** um lançamento é gravado sem local explícito
- **THEN** o lançamento é atribuído ao local padrão da loja do produto

#### Scenario: Loja sem nenhum local
- **WHEN** uma loja é criada, ou já existe sem nenhum centro de distribuição
  cadastrado
- **THEN** ela recebe um local padrão do tipo `seller`, apto a receber saldo

#### Scenario: Loja que já tem centro de distribuição cadastrado
- **WHEN** a loja já possui um ou mais centros em `centros_distribuicao`
- **THEN** eles passam a ser locais de estoque sem recadastro, e o mais antigo
  ativo é marcado como padrão

#### Scenario: Produto já vinculado a centros em `produto_centros`
- **WHEN** o produto tem vínculo com um único centro
- **THEN** o saldo migrado vai para aquele centro, e não para um local genérico

#### Scenario: Lançamento em local de outra loja
- **WHEN** um lançamento tenta usar um local que pertence a outra loja que não a
  do produto
- **THEN** a gravação é rejeitada

### Requirement: Paridade permanente entre `produtos.estoque_atual` e o ledger
O campo `produtos.estoque_atual` SHALL continuar existindo e SHALL permanecer
sempre igual à soma dos saldos do produto em todos os seus locais. Nenhum
consumidor existente do campo SHALL precisar de alteração.

Nesta fase a **autoridade de escrita continua em `produtos.estoque_atual`**, que
o checkout altera como sempre alterou, e o ledger registra cada uma dessas
alterações como lançamento. Toda escrita no campo, venha de onde vier, SHALL
gerar lançamento correspondente com motivo e origem. A inversão da autoridade
(ledger como fonte e o campo como valor derivado dele) pertence ao Milestone 2,
junto com a reserva: mudar o modelo de dados e o caminho do dinheiro na mesma
entrega concentraria risco sem necessidade.

#### Scenario: Baixa feita pelo checkout vira lançamento
- **WHEN** a criação de pedido decrementa `produtos.estoque_atual` em 3 unidades
- **THEN** exatamente um lançamento de saída de 3 unidades é gravado, com motivo
  preenchido e origem identificando o checkout

#### Scenario: Produto novo cadastrado com estoque inicial
- **WHEN** um produto é criado já com quantidade em estoque
- **THEN** um lançamento de entrada correspondente é gravado, e o saldo do ledger
  nasce igual ao campo

#### Scenario: Consumidor existente continua funcionando
- **WHEN** a vitrine, o carrinho ou o checkout leem `produtos.estoque_atual`
- **THEN** o valor lido é o mesmo que seria lido antes desta mudança, para o
  mesmo estado de estoque

#### Scenario: Escrita que não altera a quantidade
- **WHEN** o campo é reescrito com o mesmo valor que já tinha
- **THEN** nenhum lançamento é gravado

### Requirement: Ajuste de estoque pelo seller com motivo obrigatório
O seller SHALL continuar informando a quantidade de estoque no cadastro do
produto, com a mesma forma de preenchimento que usa hoje. Ao salvar uma
quantidade diferente da atual, o sistema SHALL gravar um lançamento de ajuste
correspondente à diferença, exigindo motivo. O sistema SHALL rejeitar o ajuste
sem motivo, mantendo a quantidade anterior.

#### Scenario: Seller aumenta a quantidade no cadastro
- **WHEN** o produto tem saldo 30 e o seller salva 45 com motivo informado
- **THEN** um lançamento de ajuste de mais 15 é gravado com aquele motivo, e o
  saldo passa a 45

#### Scenario: Seller salva sem informar motivo
- **WHEN** o seller altera a quantidade e salva sem motivo
- **THEN** o salvamento é recusado com aviso, e o saldo permanece o anterior

#### Scenario: Seller salva o formulário sem mexer na quantidade
- **WHEN** o seller edita outros campos do produto e salva com a mesma
  quantidade
- **THEN** nenhum lançamento é gravado e nenhum motivo é exigido

#### Scenario: Ajuste que levaria o saldo a negativo
- **WHEN** o seller informa uma quantidade menor que a já comprometida no local
- **THEN** o ajuste é recusado com o saldo disponível real na mensagem

### Requirement: Migração do saldo existente com paridade verificada
A adoção do ledger SHALL preservar exatamente o saldo vigente. Cada produto com
`estoque_atual` maior que zero SHALL receber um lançamento inicial de entrada no
local padrão da sua loja, com motivo identificando a migração. Após a migração, o
saldo calculado pelo ledger SHALL ser idêntico ao `estoque_atual` anterior para
**todos** os produtos, sem exceção tolerada.

#### Scenario: Verificação de paridade após a migração
- **WHEN** a conferência compara, produto a produto, o saldo do ledger com o
  `estoque_atual` registrado antes da migração
- **THEN** o resultado é zero produtos divergentes

#### Scenario: Divergência encontrada na conferência
- **WHEN** ao menos um produto apresenta saldo diferente do anterior
- **THEN** a adoção não avança, e a lista de produtos divergentes é produzida
  para conferência manual

#### Scenario: Produto com saldo zero
- **WHEN** o produto tem `estoque_atual` igual a zero
- **THEN** ele recebe local padrão e nenhum lançamento é gravado

#### Scenario: Reversão antes do checkout passar a usar o ledger
- **WHEN** a migração precisa ser desfeita enquanto o checkout ainda baixa
  `estoque_atual` diretamente
- **THEN** a remoção das estruturas do ledger devolve o sistema ao estado
  anterior sem perda de saldo

### Requirement: Isolamento entre sellers
O seller SHALL acessar exclusivamente lançamentos e locais das lojas que lhe
pertencem. A gravação de lançamentos SHALL ocorrer apenas por rotina do sistema,
nunca por escrita direta do cliente.

#### Scenario: Seller tenta ler lançamento de outra loja
- **WHEN** um seller consulta lançamentos informando o identificador de um
  produto de outra loja
- **THEN** o resultado é vazio, sem revelar a existência do produto

#### Scenario: Cliente tenta gravar lançamento diretamente
- **WHEN** uma requisição do cliente tenta inserir um lançamento sem passar pela
  rotina do sistema
- **THEN** a inserção é rejeitada
