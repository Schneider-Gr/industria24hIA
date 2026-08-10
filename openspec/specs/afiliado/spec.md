# Afiliado (Vendas) Specification

## Purpose
Programa de afiliados de vendas — indicação via link, comissão e painel próprio. Estado: ✅ produção; QA de rastreio `?ref=` pendente. Fonte: skills `regras-de-negocio`, `industria24-marketplace`; código em `(afiliado)/afiliado/`, `(afiliado)/afiliado/solicitar/`, `(seller)/seller/afiliados/` (visão do seller sobre seus afiliados).

## Requirements

### Requirement: Papel de afiliado é uma flag do usuário
O sistema SHALL modelar "afiliado" como uma flag no usuário (`afiliado` + `cod_afiliado`), não como um tipo de conta separado — um mesmo usuário pode acumular outros papéis (lojista, admin) simultaneamente.

#### Scenario: Usuário lojista também é afiliado
- GIVEN um usuário com a flag `lojista = true`
- WHEN ele também recebe a flag `afiliado = true`
- THEN ele acumula ambos os papéis sem precisar de uma segunda conta

### Requirement: Comissão de afiliado por produto
O sistema SHALL calcular a comissão do afiliado apenas para produtos com `PermiteAfiliacao = true`, usando o `PercentualAfiliado` configurado no produto, quando a venda ocorrer através de um link contendo `?ref=`.

#### Scenario: Venda via link de afiliado
- GIVEN um produto com `PermiteAfiliacao = true` e `PercentualAfiliado` definido
- WHEN um comprador finaliza uma compra chegando por um link `?ref=<cod_afiliado>`
- THEN o valor de `RepasseAfiliado` é calculado e atribuído ao afiliado correto

### Requirement: Sem overload ambíguo na RPC de checkout
O sistema MUST NOT usar parâmetro com `DEFAULT` na RPC de criação de pedido para diferenciar compra com/sem afiliado — já causou erro Postgres 42725 (overload ambíguo) em produção, quebrando toda compra com `?ref=`.

#### Scenario: Mudança na RPC de checkout com afiliado
- GIVEN uma alteração proposta na RPC de criação de pedido para lidar com afiliado
- WHEN o parâmetro de afiliado é adicionado
- THEN é adicionado sem `DEFAULT`, evitando overload ambíguo

### Requirement: Carência de saque
O sistema SHALL aplicar carência de 15 dias corridos antes de permitir que o afiliado saque uma comissão creditada.

#### Scenario: Afiliado tenta sacar comissão recém-creditada
- GIVEN uma comissão de afiliado creditada há menos de 15 dias
- WHEN o afiliado tenta sacar
- THEN o saque é bloqueado até completar a carência

## Known Gaps
- Ponto de início da contagem da carência de 15 dias e o tipo de bloqueio (bloqueia o quê exatamente) ainda sem decisão do dono do produto — não implementar fluxo de saque sem fechar esse detalhe.
- Já houve bug histórico de comissão creditada ao afiliado errado (corrigido); qualquer mudança nessa área exige teste de compra real com `?ref=` antes de merge.
- Afiliado não tem visão própria do ledger de repasses (`repasses` é só-admin via RLS).
