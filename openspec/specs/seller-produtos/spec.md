# Seller Produtos Specification

## Purpose

Permite ao seller gerenciar o catálogo da própria loja — cadastro, edição, exclusão
e aprovação de produtos — com apoio opcional de IA para descrição, SEO, preço
sugerido e geração de imagem.

## Requirements

### Requirement: CRUD de produto restrito à própria loja
O sistema SHALL permitir que o seller crie, edite e exclua produtos apenas da
própria loja, com filtro explícito de dono em cada mutação (não depender só de RLS).

#### Scenario: Criação válida
- **WHEN** o seller submete nome e valor numérico válido
- **THEN** o produto é criado vinculado à loja do usuário autenticado, com
  `porcentagem_afiliado` entre 0 e 100 e campos numéricos não-negativos

#### Scenario: Prevenção de gravação em loja alheia
- **WHEN** uma mutação de produto é processada
- **THEN** o sistema resolve a loja explicitamente por `owner_id = auth.uid()` no
  código da aplicação, e não confia apenas na policy pública de leitura de lojas
  ativas combinada por OR com a policy de dono

#### Scenario: Falha ao vincular centros de distribuição
- **WHEN** o produto é criado com sucesso mas o vínculo com um ou mais centros de
  distribuição falha
- **THEN** o cadastro do produto não é desfeito; o erro do vínculo é reportado
  separadamente

#### Scenario: Falha ao anexar imagem gerada por IA no cadastro
- **WHEN** o produto é criado com sucesso mas o registro da imagem gerada por IA
  falha
- **THEN** o cadastro do produto não é desfeito

### Requirement: Edição inline de estoque mínimo
O sistema SHALL permitir editar a quantidade mínima de um produto diretamente na
listagem, sem abrir o formulário completo.

#### Scenario: Valor negativo
- **WHEN** o seller tenta salvar uma quantidade mínima negativa
- **THEN** a alteração é rejeitada

### Requirement: Reenvio de produto para aprovação
O sistema SHALL permitir que o seller reenvie para análise um produto recusado ou
em análise, mudando seu status para "Pendente" — a aprovação em si é exclusiva de
admin.

#### Scenario: Produto aprovado
- **WHEN** o produto já está com status "Aprovado"
- **THEN** a opção de reenviar para aprovação não é exibida

### Requirement: KPIs de catálogo sobre o total, não sobre o filtro aplicado
O sistema SHALL calcular os KPIs de topo (total de produtos, valor total em
estoque, estoque crítico) sobre todo o catálogo da loja, independentemente do
filtro de busca/status aplicado à listagem.

#### Scenario: Produto sem nenhum produto cadastrado
- **WHEN** a loja não tem nenhum produto
- **THEN** a listagem exibe estado vazio orientando a cadastrar o primeiro produto

#### Scenario: Filtro sem resultado
- **WHEN** um filtro de busca/status não encontra nenhum produto
- **THEN** a listagem exibe um estado vazio específico de "nenhum resultado", distinto
  do estado "nenhum produto cadastrado"

### Requirement: Curadoria de produto por IA
O sistema SHALL oferecer, no formulário de edição de produto, uma sugestão de IA
que gera descrição de venda, palavras-chave de SEO e preço sugerido com
justificativa, comparando com produtos aprovados da mesma categoria — sem gravar
nada automaticamente.

#### Scenario: IA não configurada
- **WHEN** a chave de API de IA não está configurada
- **THEN** a sugestão retorna erro explícito sem realizar a chamada

#### Scenario: Sugestão aplicada
- **WHEN** a curadoria retorna com sucesso
- **THEN** descrição e valor são preenchidos no formulário; palavras-chave e
  justificativa são exibidas como referência; nada é gravado até o seller salvar

### Requirement: Geração de imagem de produto por IA
O sistema SHALL oferecer geração de imagem de catálogo a partir do nome e
descrição do produto, funcionando inclusive antes do produto existir (no
formulário de cadastro).

#### Scenario: Pipeline em duas etapas com provedores distintos
- **WHEN** a geração de imagem é acionada
- **THEN** primeiro um modelo de linguagem transforma nome e descrição num prompt
  visual; depois um modelo de geração de imagem separado produz a imagem a partir
  desse prompt

#### Scenario: Provedor de geração de imagem não configurado
- **WHEN** a chave do provedor de geração de imagem não está configurada
- **THEN** o sistema retorna o prompt gerado com um aviso de pendência, sem simular
  ou mockar uma imagem

#### Scenario: Imagem gerada com sucesso
- **WHEN** a imagem é gerada
- **THEN** ela é enviada para o armazenamento de arquivos da loja, isolada por
  identificador da loja, e a URL pública fica disponível para anexar ao produto
