## Purpose

Permite endereçar um centro de distribuição inteiro de uma vez, descrevendo a
topologia por faixas em vez de cadastrar cada posição à mão, de modo que um CD
recém-criado deixe de ficar inutilizável por excesso de trabalho manual.

## ADDED Requirements

### Requirement: Faixas expandidas de forma idêntica na tela e no servidor
O sistema SHALL expandir cada campo de faixa aceitando lista separada por
vírgula, faixa numérica e faixa de letra única, e SHALL usar a mesma expansão
para a prévia mostrada antes da confirmação e para a criação no servidor. A
quantidade apresentada na prévia SHALL ser igual à quantidade de posições que o
lote tentará criar.

#### Scenario: Lista e faixa na mesma entrada
- **WHEN** um campo recebe `DOCA, 1-3`
- **THEN** a expansão resulta em `DOCA`, `1`, `2` e `3`

#### Scenario: Faixa invertida
- **WHEN** um campo recebe `5-1`
- **THEN** a expansão resulta em `1` a `5`, porque faixa invertida é erro de
  digitação e não intenção de lista vazia

#### Scenario: Repetição na mesma faixa
- **WHEN** um campo recebe `A,a,A`
- **THEN** a expansão resulta em uma única parte `A`, e a prévia conta uma
  posição por combinação, nunca duas para a mesma posição

### Requirement: Lote criado em uma única transação
O sistema SHALL criar todas as posições de um lote em uma única transação, e NÃO
SHALL emitir uma operação por posição. Se a criação falhar, o centro SHALL
permanecer exatamente como estava antes do lote.

#### Scenario: Falha no meio do lote
- **WHEN** a criação de um lote é interrompida por erro
- **THEN** nenhuma posição daquele lote existe no centro

### Requirement: Lote repetível e incremental
O sistema SHALL ignorar, sem erro, as posições do lote que já existem no centro,
e SHALL informar quantas foram criadas e quantas já existiam.

#### Scenario: Mesmo lote enviado duas vezes
- **WHEN** um lote idêntico ao anterior é enviado
- **THEN** nenhuma posição nova é criada, e a resposta informa que todas já
  existiam

#### Scenario: Lote ampliado com uma rua nova
- **WHEN** o lote anterior é reenviado com uma rua a mais
- **THEN** apenas as posições da rua nova são criadas

### Requirement: Teto de tamanho validado nas duas pontas
O sistema SHALL recusar lote acima do teto de posições, tanto na tela quanto no
servidor, informando quantas posições o lote geraria. A validação da tela NÃO
SHALL ser a única barreira.

#### Scenario: Faixa desproporcional digitada por engano
- **WHEN** um campo recebe uma faixa que levaria o lote acima do teto
- **THEN** a criação é recusada antes de qualquer escrita, com a contagem que
  seria gerada e a orientação de dividir em lotes menores

#### Scenario: Chamada direta ao servidor acima do teto
- **WHEN** a criação é solicitada sem passar pela tela, com um lote acima do teto
- **THEN** o servidor recusa pela mesma regra

### Requirement: Lote restrito ao centro de quem o envia
O sistema SHALL recusar a criação de posições em centro que não pertença à loja
de quem está autenticado, resolvendo a propriedade por dono da loja e não apenas
por política de leitura.

#### Scenario: Centro de outra loja
- **WHEN** a criação em lote é solicitada para um centro de outra loja
- **THEN** a operação é recusada e nenhuma posição é criada
