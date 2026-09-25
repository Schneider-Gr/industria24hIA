## ADDED Requirements

### Requirement: Upload da tabela de faixas de frete
O sistema SHALL permitir que o admin (transportadora global) e o seller (transportadora própria) selecionem uma transportadora e enviem, em CSV (`;`) ou XLSX, a tabela de faixas no formato Bubble ampliado: CepInicial, CepFinal, PesoInicial, PesoFinal, Valor, Prazo Entrega Maximo, Prazo Entrega Minimo, AdValorem, KgAdicional, ICMS, Frete Minimo, Taxa Fixa por Envio e, opcionais, CepOrigemInicial e CepOrigemFinal (vazias = qualquer origem; a origem de um envio é o CEP de origem do produto). O formato antigo do Bubble SHALL ser aceito. CepInicial, CepFinal, PesoInicial, PesoFinal e Valor SHALL ser obrigatórios; as demais colunas vazias SHALL valer zero, exceto os prazos, que ficam vazios. Limites SHALL ser inclusivos. O sistema SHALL mostrar preview com linhas válidas e erros por linha antes de gravar, e SHALL gravar só após confirmação, substituindo integralmente a tabela anterior da transportadora. O limite SHALL ser de 15.000 linhas.

#### Scenario: Planilha no formato Bubble ampliado
- **WHEN** o usuário envia uma planilha com faixas CepInicial 69000000 a 69099999, PesoInicial 0 a PesoFinal 10 e Valor 20,00
- **THEN** o preview mostra a faixa com esses limites, sem convertê-la em ponto exato

#### Scenario: Planilha de cotação por envio
- **WHEN** o usuário envia a planilha de cotação por envio (colunas CEP origem, CEP destino, Volume, Peso, Valor Atual Frete)
- **THEN** o sistema recusa o arquivo inteiro com mensagem apontando o modelo de faixas para download

#### Scenario: Linha com CEP inválido ou mal formatado
- **WHEN** uma linha tem CEP fora do padrão, CEP inicial maior que o final, peso final menor que o inicial, prazo mínimo maior que o máximo, ou valor negativo ou não numérico
- **THEN** o preview aponta o erro na linha; CEP com máscara é normalizado automaticamente

#### Scenario: Faixas sobrepostas
- **WHEN** duas linhas da mesma transportadora cobrem o mesmo CEP de origem, CEP de destino e peso
- **THEN** o preview aponta as linhas conflitantes e a tabela não é gravada até o usuário corrigir

#### Scenario: Linha ignorada
- **WHEN** uma linha tem Valor vazio ou coluna "Atende" igual a N
- **THEN** a linha é ignorada e o preview informa quantas foram ignoradas

#### Scenario: KgAdicional vazio
- **WHEN** a tabela não tem KgAdicional
- **THEN** o preview avisa que pesos acima da maior faixa não terão frete por essa transportadora

#### Scenario: Confirmação do import
- **WHEN** o usuário revisa o preview sem erros e confirma
- **THEN** o sistema substitui de uma vez todas as faixas da transportadora pelas novas; se a gravação falhar, a tabela anterior continua valendo

#### Scenario: Planilha só com erros ou acima do limite
- **WHEN** a planilha não tem nenhuma linha válida ou tem mais de 15.000 linhas
- **THEN** nada é gravado e a tabela anterior continua valendo

## REMOVED Requirements

### Requirement: Upload da tabela de frete de uma transportadora
**Reason**: Converter cada cotação pontual em faixa de largura mínima (um CEP, um peso) faz o carrinho quase nunca bater com uma faixa, e o checkout cai no frete percentual sem avisar (PRD 049, diagnóstico de 24/09/2026). Substituído por "Upload da tabela de faixas de frete".
**Migration**: A planilha de cotação por envio passa a ser recusada com o modelo de faixas para download. Em produção não há faixa gravada (0 linhas em 24/09/2026).
