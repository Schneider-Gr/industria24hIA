# Venda Futura — Devolução Parcial Specification

## Purpose

Permite ao comprador de um item de venda futura abrir uma devolução por
avaria/quantidade incorreta na entrega, restringindo o desfecho da
arbitragem a reembolso parcial (proporcional ao defeito mostrado nas fotos)
ou negada — nunca troca nem reembolso total, porque o item de venda futura
já foi entregue/consumido no momento da colheita/produção, sem via de
devolução física. Reaproveita a infraestrutura de disputas padrão (PRD
009/010, `disputas`, `disputa_mensagens_mediacao`) — sem tabela nova.
Estado: ✅ produção, 12/08/2026 (migration
`0118_disputa_venda_futura_devolucao_parcial.sql`). Os PRDs 009 e o de
mediação (`pos-venda-disputas-workflow-mediacao.md`) previam esse caso como
"fora de escopo até PRD dedicado" — este spec e o PRD
`venda-futura-devolucao-parcial-fotos.md` fecham essa lacuna.

## Requirements

### Requirement: Foto obrigatória para abrir disputa de item de venda futura
O sistema SHALL exigir ao menos uma foto ao abrir uma disputa sobre um item
cuja linha do pedido tenha `venda_futura_id` preenchido — sem foto não há
como avaliar o defeito para decidir o valor do reembolso parcial.

#### Scenario: Comprador tenta abrir sem foto
- **WHEN** o comprador tenta abrir uma disputa de item de venda futura sem
  anexar nenhuma foto
- **THEN** o sistema bloqueia com "Disputa de item de venda futura exige ao
  menos uma foto"

### Requirement: Desfecho restrito a reembolso parcial ou negada
O sistema SHALL impedir que o admin registre desfecho `troca` ou
`reembolso_total` para uma disputa cujo item seja de venda futura — só
`reembolso_parcial` (com valor, sujeito ao teto do valor do item, regra já
existente) ou `negada` são aceitos.

#### Scenario: Admin tenta registrar troca em item de venda futura
- **WHEN** o admin tenta registrar decisão `troca` numa disputa de item de
  venda futura
- **THEN** o servidor bloqueia a submissão com "Item de venda futura só
  aceita reembolso parcial ou negada" e nenhuma decisão é gravada

#### Scenario: Admin registra reembolso parcial normalmente
- **WHEN** o admin registra `reembolso_parcial` com valor dentro do teto do
  item numa disputa de venda futura
- **THEN** a decisão é gravada normalmente, mesmo fluxo de disputa padrão
  (sem pagamento automático — cria pendência no processo manual)

### Requirement: Janela de disputa padrão, sem regra própria de prazo
O sistema SHALL aplicar a mesma janela de 7 dias corridos após confirmação
de entrega usada no fluxo padrão de disputas — item de venda futura não é
perecível por definição, não herda a janela reduzida de 24h.

#### Scenario: Disputa de venda futura dentro do prazo padrão
- **WHEN** o comprador abre uma disputa de item de venda futura até 7 dias
  após a entrega confirmada
- **THEN** a disputa é aceita normalmente
