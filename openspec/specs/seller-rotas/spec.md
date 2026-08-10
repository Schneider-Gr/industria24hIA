# Seller Rotas (Logística) Specification

## Purpose

Permite ao seller atribuir manualmente uma rota de entrega pendente a um afiliado
logístico aprovado ou a um parceiro logístico da plataforma.

> **Nota de estado real:** desde a introdução do despacho automático de corridas
> (ver `seller-corridas`), novos pedidos com entrega passaram a gerar registro na
> tabela de corridas, não mais na tabela de rotas usada por esta tela. Não foi
> encontrado nenhum ponto do código que ainda insira uma rota nova — esta
> especificação documenta o comportamento do fluxo manual como ele existe no
> código, mas ele pode estar recebendo apenas dados legados. *(premissa — confirme
> ou corrija: se o fluxo de Rotas está formalmente descontinuado, considerar
> retirar esta capability em vez de mantê-la ativa)*

## Requirements

### Requirement: Atribuição de rota pendente
O sistema SHALL permitir ao seller dono da loja atribuir uma rota pendente a
exatamente um responsável — um afiliado logístico aprovado da própria loja ou um
parceiro logístico aprovado da plataforma.

#### Scenario: Rota já atribuída
- **WHEN** a rota já não está mais com status "Pendente"
- **THEN** a atribuição é rejeitada, informando o status atual

#### Scenario: Afiliado sem aprovação para logística
- **WHEN** o afiliado indicado não tem afiliação aprovada do tipo logística para
  aquela loja
- **THEN** a atribuição é rejeitada

#### Scenario: Parceiro sem aprovação
- **WHEN** o parceiro logístico indicado não está com status aprovado no cadastro
  da plataforma
- **THEN** a atribuição é rejeitada

#### Scenario: Atribuição por quem não é dono da loja
- **WHEN** um usuário que não é dono da loja da rota tenta atribuí-la
- **THEN** a atribuição é rejeitada

### Requirement: Notificação best-effort ao responsável designado
O sistema SHALL notificar por WhatsApp o afiliado ou parceiro designado após a
atribuição, sem desfazer a atribuição caso o envio da notificação falhe.

#### Scenario: Falha no envio da notificação
- **WHEN** a atribuição da rota é concluída mas o envio da notificação por
  WhatsApp falha
- **THEN** a atribuição permanece válida, apenas a notificação não é entregue

### Requirement: Sem comissão de plataforma no fluxo manual
O sistema SHALL exibir ao responsável designado o valor de frete cheio, sem
descontar comissão de plataforma — diferente do fluxo automático de corridas.

#### Scenario: Valor exibido ao responsável
- **WHEN** uma rota é atribuída manualmente a um afiliado ou parceiro
- **THEN** o valor de frete comunicado é o valor cheio, sem dedução de comissão
