# Parceiro Logístico Specification

## Purpose
Cadastro e operação do parceiro logístico (mobilidade urbana, roteirização, leilão reverso de corridas) — distinto do afiliado de vendas. Estado: ✅ mínimo em produção; plena descrita em PRDs em rascunho. Fonte: skill `regras-de-negocio`; código em `(parceiro)/parceiro/`, `(parceiro)/parceiro/cadastro/`, `(seller)/seller/parceiro-logistica/`.

## Requirements

### Requirement: Termos próprios com gate de aceite
O sistema SHALL exigir que o parceiro logístico aceite termos específicos (`/termos/[slug]`) antes de operar corridas na plataforma.

#### Scenario: Parceiro sem aceite tenta operar
- GIVEN um parceiro logístico cadastrado sem aceite dos termos
- WHEN ele tenta aceitar uma corrida
- THEN o sistema bloqueia até o aceite dos termos em `/termos/[slug]`

### Requirement: Cadastro de parceiro logístico
O sistema SHALL disponibilizar fluxo de cadastro em `/parceiro/cadastro`, distinto do cadastro de seller/lojista.

#### Scenario: Novo parceiro se cadastra
- GIVEN um visitante interessado em ser parceiro logístico
- WHEN ele completa o cadastro em `/parceiro/cadastro`
- THEN uma conta de parceiro é criada, distinta de uma conta de seller

### Requirement: Leilão reverso de corridas
O sistema SHALL oferecer corridas ao pool de parceiros logísticos via mecanismo de leilão reverso quando a corrida não for exclusiva de um afiliado logístico específico (ver spec `entregas` para a regra de exclusividade por produto).

#### Scenario: Corrida sem exclusividade de afiliado
- GIVEN uma corrida cujo pedido não atende ao critério de exclusividade de afiliado logístico
- WHEN a corrida é despachada
- THEN ela entra no leilão reverso do pool geral de parceiros

## Known Gaps
- "Crédito/Parceiro logística" (PR #35) está aberto, não mergeado, sem dado real, schema pendente — não tratar como existente em nenhuma spec.
- Botões/telas do parceiro logístico sem paridade Bubble confirmada não devem ser implementados sem checar `paridade-bubble` primeiro (ex.: já existe precedente de botão morto no Bubble, como "Dados" do parceiro logístico, que não deve ser reimplementado).
