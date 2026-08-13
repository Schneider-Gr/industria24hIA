## Purpose

Define o comportamento observável da vitrine curada do afiliado: uma coleção nomeada de produtos já afiliados, publicada como página pública com uma única URL de divulgação, sem introduzir um novo mecanismo de rastreamento de comissão.

## ADDED Requirements

### Requirement: Montagem de coleção a partir de produtos afiliados
O sistema SHALL permitir que o afiliado autenticado monte uma coleção nomeada contendo produtos para os quais ele já possui afiliação (`Pendente` ou `Aprovada`), incluindo produtos recém-criados por uma efetivação em lote ou afiliações anteriores.

#### Scenario: Afiliado monta coleção após efetivar um lote
- **WHEN** o afiliado confirma um lote de afiliações e em seguida escolhe organizá-las em uma coleção nomeada
- **THEN** o sistema cria a coleção associando os produtos selecionados, sem exigir que eles já estejam com status `Aprovada`

#### Scenario: Afiliado tenta incluir produto sem afiliação própria
- **WHEN** o afiliado tenta adicionar à coleção um produto para o qual não possui nenhuma afiliação
- **THEN** o sistema rejeita a inclusão desse produto na coleção

### Requirement: Link único de divulicação da coleção
O sistema SHALL publicar cada coleção em uma página pública própria, acessível por uma única URL, sem exigir login para visualização.

#### Scenario: Visitante acessa a página da coleção
- **WHEN** um visitante abre a URL pública de uma coleção
- **THEN** o sistema exibe os produtos daquela coleção, mesmo sem o visitante estar autenticado

### Requirement: Rastreamento por produto preservado dentro da coleção
O sistema SHALL preservar o mecanismo de rastreamento de comissão já existente por produto (identificador individual de afiliação e cookie `afiliado_ref`) para cada produto listado dentro da página da coleção, sem introduzir um identificador único que substitua o rastreamento por produto.

#### Scenario: Compra a partir da página da coleção
- **WHEN** um visitante entra pela página pública de uma coleção e compra um dos produtos listados
- **THEN** o sistema credita a comissão usando o identificador de afiliação daquele produto especificamente, pelo mesmo mecanismo já usado fora da coleção

### Requirement: Cookie de rastreio grava o identificador do produto, não da coleção
O sistema SHALL gravar, ao clicar num produto dentro da página da coleção, o `?ref=` **daquele produto** (o identificador da afiliação individual dele) no cookie `afiliado_ref` — nunca o slug ou um identificador da coleção. O comportamento do `CapturaRef` SHALL permanecer inalterado por este change.

#### Scenario: Coleção com produtos de percentuais diferentes
- **WHEN** um visitante clica, dentro da mesma página de coleção, em dois produtos com `porcentagem_afiliado` diferentes, em visitas separadas
- **THEN** cada compra credita o percentual correto do produto efetivamente comprado, sem misturar ou aplicar o percentual de um produto à venda de outro

### Requirement: Repasse íntegro para vendas originadas na coleção
O sistema SHALL garantir que uma venda originada a partir da página de uma coleção siga o mesmo caminho de cálculo de repasse (`repasses_recalcular_pedido`, migration 0111) que uma venda originada por um link de afiliação individual, sem exigir mudança nesse cálculo.

#### Scenario: Venda pela coleção gera repasse pendente
- **WHEN** um pedido é confirmado a partir de uma compra iniciada na página de uma coleção
- **THEN** o repasse ao afiliado correspondente aparece em `repasses` com o valor correto, do mesmo jeito que apareceria se a venda tivesse vindo do link individual do produto

### Requirement: Gerenciamento da coleção pelo afiliado
O sistema SHALL permitir que o afiliado renomeie a coleção, adicione novos produtos afiliados a ela e remova produtos, sem alterar a URL pública já publicada.

#### Scenario: Afiliado remove um produto da coleção
- **WHEN** o afiliado remove um produto de uma coleção já publicada
- **THEN** a página pública da coleção deixa de exibir esse produto, mas a URL da coleção continua válida para os produtos restantes
