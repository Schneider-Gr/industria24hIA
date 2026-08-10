# Seller Publicidade Specification

## Purpose

Permite ao seller registrar a intenção de patrocinar um produto aprovado, com
orçamento diário e janela de datas — a campanha real em plataforma de anúncios
externa exige conexão separada e não é criada automaticamente por esta feature.

## Requirements

### Requirement: Patrocínio é intenção, não campanha automática
O sistema SHALL registrar o pedido de patrocínio sempre com status inicial
pendente — a ativação da campanha na plataforma de anúncios externa exige um
passo de conexão separado, fora do alcance desta feature.

#### Scenario: Nenhum produto aprovado
- **WHEN** a loja não tem nenhum produto com status "Aprovado"
- **THEN** o formulário de patrocínio não é exibido; uma mensagem orienta a
  aprovar um produto antes de anunciar

### Requirement: Patrocinar produto aprovado
O sistema SHALL permitir patrocinar apenas produtos com status "Aprovado",
exigindo orçamento diário maior que zero e data de início.

#### Scenario: Data de fim anterior à data de início
- **WHEN** a data de fim informada é anterior à data de início
- **THEN** o patrocínio é rejeitado

### Requirement: Pausar e reativar patrocínio
O sistema SHALL permitir pausar um patrocínio pendente e reativar um patrocínio
pausado, alternando entre os dois estados.

#### Scenario: Reativação não avança para "Ativo"
- **WHEN** um patrocínio pausado é reativado
- **THEN** ele volta ao status "Pendente", não a "Ativo" — a transição para
  "Ativo"/"Encerrado" depende de um processo externo não coberto por esta ação
  *(premissa — confirme ou corrija: possivelmente webhook da plataforma de
  anúncios ainda não implementado no fluxo lido)*
