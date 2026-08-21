## Purpose

Manter o comprador (e a loja, quando aplicável) informado por WhatsApp nos
momentos-chave do ciclo do pedido que hoje só existem como mudança de estado
silenciosa no banco: saída para entrega e o ciclo de disputa/troca/devolução.
Usa a integração BubbleWhats (`integracao-bubblewhats`) como gateway.

## ADDED Requirements

### Requirement: Aviso de código de entrega via BubbleWhats
O sistema SHALL enviar a mensagem de código de retirada/entrega ao comprador
via `enviarBubblewhats` (não mais via `enviarWhatsapp`/Meta) quando o
pagamento é confirmado e o pedido tem `codigo_retirada`.

#### Scenario: Pagamento confirmado com telefone do comprador conhecido
- **WHEN** o webhook Asaas confirma pagamento de um pedido com
  `telefone_contato` (ou telefone anterior do mesmo cliente) e `codigo_retirada`
- **THEN** o sistema envia a mensagem de código via BubbleWhats

### Requirement: Aviso de saída para entrega
O sistema SHALL notificar o comprador quando o status da rota/corrida do
pedido transicionar para `EmTransito`, seja por evento do Uber Direct ou por
marcação manual do entregador/afiliado ("Iniciar trânsito").

#### Scenario: Rota via Uber Direct entra em trânsito
- **WHEN** o webhook do Uber Direct reporta status mapeado para `EmTransito`
- **THEN** o sistema busca o telefone do comprador do pedido vinculado e envia
  o aviso de saída para entrega, sem bloquear a atualização de status em caso
  de falha de envio

#### Scenario: Entregador/afiliado marca "Iniciar trânsito" manualmente
- **WHEN** `atualizarStatusCorrida` ou a ação equivalente de rota é chamada
  com status `EmTransito`
- **THEN** o sistema envia o mesmo aviso de saída para entrega ao comprador

### Requirement: Avisos do ciclo de disputa
O sistema SHALL notificar as partes relevantes nos 3 momentos do ciclo de
disputa: abertura (loja), proposta de resolução (comprador) e decisão final da
mediação (comprador e loja).

#### Scenario: Comprador abre disputa
- **WHEN** `abrirDisputa` é executado com sucesso
- **THEN** o sistema envia um aviso à loja com o motivo da disputa

#### Scenario: Loja propõe resolução (troca/devolução/reembolso)
- **WHEN** `proporResolucao` muda o status para `aguardando_confirmacao_comprador`
- **THEN** o sistema envia um aviso ao comprador com a proposta

#### Scenario: Admin decide a mediação
- **WHEN** `decidirDisputa` muda o status para `resolvida`
- **THEN** o sistema envia um aviso da decisão final ao comprador e à loja

### Requirement: Falha de envio nunca bloqueia a operação principal
O sistema SHALL tratar qualquer falha de `enviarBubblewhats` nestes 5 pontos
como best-effort — a operação de negócio (confirmação de pagamento, mudança de
status de rota/corrida, decisão de disputa) SHALL completar e persistir mesmo
que o envio de WhatsApp falhe.

#### Scenario: BubbleWhats indisponível durante uma transição de status
- **WHEN** `enviarBubblewhats` retorna falha (qualquer motivo) durante uma das
  5 operações acima
- **THEN** a operação de negócio já persistida no banco não é revertida nem
  impedida de completar
