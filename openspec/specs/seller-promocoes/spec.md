# Seller Promoções Specification

## Purpose

Permite ao seller configurar desconto progressivo por volume (faixas de preço por
quantidade mínima) para produtos da própria loja, com no máximo uma promoção ativa
por produto.

## Requirements

### Requirement: Uma promoção ativa por produto
O sistema SHALL manter no máximo uma linha de promoção progressiva ativa por
produto — uma nova faixa enviada para um produto que já tem promoção é adicionada
à mesma linha, não cria uma segunda.

#### Scenario: Adicionar faixa sem informar limite de participantes
- **WHEN** o seller acrescenta uma nova faixa a uma promoção existente sem
  reenviar o limite de participantes
- **THEN** o limite já cadastrado anteriormente é preservado, não é apagado

### Requirement: Validação de quantidade mínima e valor da faixa
O sistema SHALL exigir quantidade mínima maior que zero e valor unitário maior
que zero em cada faixa cadastrada.

#### Scenario: Limite de participantes inválido
- **WHEN** o limite máximo de participantes é informado e é menor que 2
- **THEN** a promoção é rejeitada — uma coletiva com 1 pessoa não é coletiva

### Requirement: Ativar ou desativar promoção
O sistema SHALL permitir alternar uma promoção entre ativa e inativa sem excluir a
configuração de faixas.

#### Scenario: Desativação preserva as faixas cadastradas
- **WHEN** o seller desativa uma promoção
- **THEN** as faixas de desconto configuradas permanecem salvas, prontas para
  reativação posterior

### Requirement: Sugestão de faixas por IA
O sistema SHALL oferecer uma sugestão de IA que gera de 3 a 5 faixas de desconto
progressivo (quantidade crescente, preço decrescente) a partir do preço atual do
produto — sem gravar nada automaticamente.

#### Scenario: Produto já tem promoção ativa
- **WHEN** a sugestão de IA é aplicada a um produto que já tem uma promoção ativa
- **THEN** as faixas sugeridas substituem completamente as faixas existentes
  (diferente do cadastro manual, que adiciona faixa em vez de substituir)

#### Scenario: Fora de faixa de desconto plausível
- **WHEN** a IA sugere faixas de desconto
- **THEN** a instrução ao modelo pede desconto entre 3% e 20% sobre o preço atual —
  essa faixa não é validada matematicamente no código além da checagem de
  quantidade e valor positivos *(premissa — confirme ou corrija: ausência de
  validação determinística do percentual de desconto é uma lacuna, diferente do
  padrão usado no assistente de preço de compra coletiva)*
