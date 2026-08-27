## Purpose

Faz o peso real dos produtos do carrinho chegar até a cotação de frete, para que faixas de peso da tabela importada (`transportadora_faixas_frete`) diferentes da faixa que cobre peso 0 sejam alcançáveis.

## ADDED Requirements

### Requirement: Peso do carrinho soma o peso cadastrado dos produtos
Ao cotar frete no checkout, o sistema SHALL somar o peso real (`produtos.peso` × quantidade) dos itens do carrinho da loja sendo cotada, e enviar esse total como `peso_kg` na cotação.

#### Scenario: Todos os produtos do carrinho têm peso cadastrado
- **WHEN** o carrinho de uma loja tem itens cujos produtos têm `peso` preenchido
- **THEN** o `peso_kg` enviado à cotação é a soma de `peso × quantidade` de cada item

#### Scenario: Produto sem peso cadastrado no carrinho
- **WHEN** um item do carrinho corresponde a um produto com `peso` nulo
- **THEN** esse item contribui 0 ao peso total (mesmo placeholder já documentado em `docs/prd/fluxo-frete-completo.md`), sem bloquear a cotação dos demais itens

#### Scenario: Carrinho totalmente sem peso cadastrado
- **WHEN** nenhum produto do carrinho tem peso cadastrado
- **THEN** o `peso_kg` enviado é 0, preservando o comportamento anterior a esta change
