# Seller Venda Futura Specification

## Purpose

Permite ao seller cadastrar previsões de disponibilidade futura de um produto
(pré-venda de safra ou lote de produção) na sua loja, com estoque, preço unitário
e data de disponibilidade — opcionalmente apoiado por uma sugestão de IA baseada
no histórico real do próprio produto.

## Requirements

### Requirement: Cadastro manual de venda futura
O sistema SHALL permitir que o seller cadastre uma venda futura informando produto,
estoque, valor unitário (opcional) e data de disponibilidade, restrita aos produtos
da própria loja.

#### Scenario: Cadastro válido
- **WHEN** o seller autenticado, dono de uma loja com ao menos um produto, submete o
  formulário com produto, estoque e previsão preenchidos
- **THEN** um novo registro é criado em `vendas_futuras` vinculado ao produto e a
  listagem da página é atualizada

#### Scenario: Loja sem produto cadastrado
- **WHEN** o seller acessa a página de venda futura e a loja não tem nenhum produto
- **THEN** o formulário de cadastro não é exibido; uma mensagem orienta a cadastrar um
  produto antes

#### Scenario: Campos obrigatórios ausentes
- **WHEN** produto, previsão ou estoque não são informados, ou estoque não é um número
  válido
- **THEN** o cadastro é rejeitado com erro claro, sem gravar registro

#### Scenario: Valor opcional inválido
- **WHEN** o campo valor é preenchido mas não é um número positivo
- **THEN** o cadastro é rejeitado com erro "Valor inválido", sem gravar registro

#### Scenario: Usuário não autenticado
- **WHEN** uma requisição de cadastro chega sem sessão de usuário válida
- **THEN** o sistema rejeita com erro de autenticação, sem gravar registro

### Requirement: Remoção de venda futura
O sistema SHALL permitir que o seller remova um registro de venda futura já
cadastrado.

#### Scenario: Remoção válida
- **WHEN** o seller autenticado submete a remoção de um registro pelo id
- **THEN** o registro é excluído de `vendas_futuras` e a listagem é atualizada

#### Scenario: Id ausente
- **WHEN** a remoção é submetida sem um id de registro
- **THEN** o sistema rejeita com erro "Registro inválido", sem excluir nada

### Requirement: Listagem de vendas futuras da loja
O sistema SHALL exibir todas as vendas futuras cadastradas para os produtos da loja
do seller autenticado, ordenadas pela data de disponibilidade.

#### Scenario: Listagem com registros
- **WHEN** a loja do seller tem vendas futuras cadastradas
- **THEN** a página exibe produto, data de disponibilidade, estoque e valor de cada uma,
  ordenadas da previsão mais próxima para a mais distante

#### Scenario: Listagem vazia
- **WHEN** a loja não tem nenhuma venda futura cadastrada
- **THEN** a página exibe uma mensagem de estado vazio, sem erro

### Requirement: Sugestão de IA para estoque, valor e data
O sistema SHALL oferecer, no formulário de cadastro, uma sugestão de IA que
pré-preenche estoque, valor e data de disponibilidade a partir do histórico do
produto selecionado, sem gravar nenhum dado automaticamente.

#### Scenario: Sugestão aceita implicitamente ao editar e submeter
- **WHEN** o seller seleciona um produto e aciona a sugestão de IA
- **THEN** os campos de estoque, valor e previsão do formulário são preenchidos com o
  resultado, junto com uma justificativa em texto; nenhum registro é gravado nesse
  momento

#### Scenario: IA não configurada
- **WHEN** a variável de ambiente da API de IA não está configurada
- **THEN** a sugestão retorna erro "IA não configurada", sem alterar os campos do
  formulário

#### Scenario: Produto de outra loja
- **WHEN** o produto informado não pertence à loja do usuário autenticado
- **THEN** a sugestão retorna erro "Produto não encontrado", sem alterar os campos do
  formulário

#### Scenario: Sessão expirada
- **WHEN** a sessão do usuário expira entre o carregamento da página e o clique na
  sugestão
- **THEN** a sugestão retorna erro "Sessão expirada", sem alterar os campos do
  formulário

#### Scenario: IA retorna data no passado
- **WHEN** a data sugerida pela IA é anterior à data atual
- **THEN** a sugestão é descartada e um erro pede nova tentativa, sem preencher os
  campos com a data inválida

### Requirement: Motivo declarado da sugestão de IA
O sistema SHALL classificar toda sugestão de IA com um motivo explícito —
`sazonalidade_conhecida`, `intervalo_historico` ou `sem_base_conservador` — e exibir
esse motivo ao seller junto da justificativa.

#### Scenario: Produto agrícola/sazonal conhecido
- **WHEN** o produto tem sazonalidade real conhecida (ex.: safra agrícola)
- **THEN** o motivo retornado é `sazonalidade_conhecida` e a justificativa referencia
  essa sazonalidade

#### Scenario: Produto industrial com histórico suficiente
- **WHEN** o produto não tem sazonalidade conhecida mas tem 2 ou mais vendas futuras
  cadastradas anteriormente
- **THEN** o motivo retornado é `intervalo_historico`, e a data sugerida é calculada a
  partir do intervalo médio real (em dias) entre os cadastros anteriores, calculado de
  forma determinística — não estimado livremente pela IA

#### Scenario: Produto sem sazonalidade e sem histórico suficiente
- **WHEN** o produto não tem sazonalidade conhecida e tem menos de 2 vendas futuras
  cadastradas anteriormente
- **THEN** o motivo retornado é `sem_base_conservador`, a data sugerida usa uma janela
  conservadora padrão (~30 dias) e a justificativa declara explicitamente a ausência de
  base histórica, sem descrever um motivo de negócio inventado
