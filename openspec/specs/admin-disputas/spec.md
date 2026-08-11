# Admin Disputas (Mediação) Specification

## Purpose

Permite ao admin (mediador da Indústria24h) arbitrar disputas escaladas pelo
comprador — visualizar histórico, conversar em canais privados separados com
cada lado e registrar a decisão final. Estado: ✅ produção, 10/08/2026
(migration `0115_disputas_workflow_mediacao.sql`, PR #261 no repo `web`).

## Requirements

### Requirement: Escalonamento chega ao admin em dois casos
O sistema SHALL mover uma disputa para `em_mediacao_admin` quando: (a) o SLA
de 48h da loja expirar sem qualquer resposta/proposta; ou (b) o comprador
recusar explicitamente uma proposta de resolução da loja
(`aguardando_confirmacao_comprador` → `em_mediacao_admin`), sem trava de
tempo neste segundo caso.

#### Scenario: Comprador recusa proposta e escala na hora
- **GIVEN** uma disputa em `aguardando_confirmacao_comprador` havia poucos
  minutos
- **WHEN** o comprador clica em "Recusar e pedir mediação"
- **THEN** o status muda para `em_mediacao_admin` imediatamente, sem checar
  SLA nem tempo mínimo desde a proposta

### Requirement: Fila de disputas escaladas filtrável por status
O sistema SHALL exibir ao admin uma fila de disputas escaladas, filtrável por
status via querystring, no mesmo padrão de outras filas administrativas do
projeto.

#### Scenario: Filtro por status
- **WHEN** o admin acessa a fila com `?status=em_mediacao_admin`
- **THEN** só disputas com esse status aparecem na listagem

### Requirement: SLA do admin com indicador de atraso, sem ação automática
O sistema SHALL conceder ao admin um prazo de 24h a partir do escalonamento
(`escalada_em`) para atuar numa disputa em mediação. Estourar o prazo MUST
NOT disparar nenhuma ação automática — só marca a disputa como "Atrasada" na
fila e no detalhe, para priorização visual.

#### Scenario: Disputa escalada há mais de 24h sem decisão
- **GIVEN** uma disputa em `em_mediacao_admin` escalada há mais de 24h
- **WHEN** o admin acessa a fila ou o detalhe do caso
- **THEN** a disputa aparece marcada como "Atrasada", sem nenhuma outra
  consequência automática *(não testado ao vivo — nenhum caso real ficou
  aberto tempo suficiente nesta rodada)*

### Requirement: Canal de mediação privado e separado por lado
O sistema SHALL, a partir do escalonamento, oferecer ao admin dois canais de
mensagem privados e independentes — um só com o comprador, outro só com a
loja — armazenados em tabela própria (`disputa_mensagens_mediacao`), nunca
reaproveitando `conversas`/`mensagens` (que amarra comprador e loja na mesma
linha por design). Nenhum dos dois lados MUST ver as mensagens trocadas entre
o admin e o outro lado.

#### Scenario: Admin visualiza as duas threads lado a lado
- **GIVEN** uma disputa em mediação com mensagens em ambos os canais
- **WHEN** o admin abre o detalhe da disputa
- **THEN** vê "Canal privado — comprador" e "Canal privado — loja" lado a
  lado, cada um só com as mensagens do respectivo canal *(verificado ao vivo
  em produção, 10/08/2026)*

#### Scenario: Admin também vê o histórico anterior à escalada
- **GIVEN** uma disputa que teve conversa pública comprador↔loja antes de
  escalar
- **WHEN** o admin abre o detalhe da disputa
- **THEN** vê esse histórico anterior como contexto read-only, separado dos
  dois canais privados de mediação

### Requirement: Decisão de arbitragem auditável
O sistema SHALL permitir que o admin registre uma decisão dentre
`reembolso_total`, `reembolso_parcial` (com valor), `troca` ou `negada`,
sempre com justificativa textual obrigatória.

#### Scenario: Reembolso parcial não pode exceder o valor do item
- **WHEN** o admin tenta registrar reembolso parcial com valor maior que o
  valor do item disputado
- **THEN** o sistema bloqueia a submissão e nenhuma decisão é gravada
  *(verificado ao vivo — tentativa de R$100 num item de R$45 foi bloqueada)*

### Requirement: Decisão de reembolso não dispara pagamento automático
O sistema SHALL, ao registrar uma decisão de reembolso, apenas criar uma
pendência no processo manual de repasse/estorno já existente — a execução
financeira segue manual, fora deste fluxo.

#### Scenario: Admin decide reembolso total
- **WHEN** a decisão é registrada
- **THEN** uma pendência é criada no processo manual de repasse/estorno, sem
  nenhum pagamento automático disparado
