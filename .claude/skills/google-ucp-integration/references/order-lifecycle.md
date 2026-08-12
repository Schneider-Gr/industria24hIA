# Ciclo de vida de pedido (pós-compra) — Webhooks

Fonte: https://developers.google.com/merchant/ucp/guides/orders

Depois que o checkout é completado e um pedido é criado, é obrigatório enviar atualizações de status para o Google via webhook de pedido.

- **Endpoint:** `https://shoppingdataintegration.googleapis.com/v1/webhooks/partners/[PARTNER_ID]/events/order?key=[API_KEY]`
  - Google compartilha o `PARTNER_ID` e a `API_KEY` com o negócio.
- A API key pode ser fornecida de duas formas:
  - Como parâmetro de URL: `?key=[API_KEY]`
  - Via header HTTP: `X-Goog-Api-Key: [API_KEY]`
- **Payload:** é obrigatório enviar a entidade de pedido **completa** em toda atualização — nunca um diff parcial.

## 1. Autenticação e assinatura de requisição

### Versão `2026-01-23`
Assinatura simétrica via chave HMAC compartilhada pelo Google, OU assinatura assimétrica:
1. Selecionar uma chave do array `signing_keys` no perfil UCP.
2. Criar um JWT destacado (RFC 7797) sobre o corpo da requisição usando a chave selecionada.
3. Incluir o JWT no header `Request-Signature`.
4. Incluir o ID da chave no claim `kid` do header do JWT, para o receptor identificar qual chave usar na verificação.

### Versão `2026-04-08`
Mudanças principais: novos headers obrigatórios de webhook e procedimento específico de assinatura de requisição.

**Headers obrigatórios em toda requisição de webhook:**
- `Webhook-Id`: identificador único deste evento específico — deve corresponder ao `id` do evento primário sendo enviado (ex.: o ID do evento de fulfillment ou de ajuste).
- `Webhook-Timestamp`: timestamp de quando o evento ocorreu.

Esses headers substituem os campos `id` e `created_time` anteriormente esperados no payload do pedido.

**Procedimento de assinatura (RFC 9421):**
1. Computar o digest SHA-256 do corpo bruto da requisição e definir o header `Content-Digest`.
2. Selecionar uma chave de assinatura em `signing_keys` no perfil UCP.
3. Construir a base de assinatura conforme RFC 9421.
4. Definir os headers `UCP-Agent`, `Signature-Input` e `Signature`:
   - `UCP-Agent`: link para o perfil UCP no formato `profile="https://merchant.example.com/.well-known/ucp"`.
   - `Signature-Input`: campo estruturado descrevendo os componentes contidos na assinatura, além do `keyid` usado — deve corresponder ao `kid` da chave de assinatura selecionada.
   - `Signature`: a base de assinatura assinada com a chave privada e codificada em base64.

## 2. Eventos obrigatórios de atualização de pedido

- **Order created** — trigger: imediatamente após o pedido ser confirmado (`status: processing`).
- **Order shipped**
- **Order delivered**

### Exemplo — Order created (v2026-04-08)

Headers obrigatórios: `Webhook-Id: order_01`, `Webhook-Timestamp: 2026-03-23T19:00:00Z`

```json
{
  "ucp": { "version": "2026-04-08", "capabilities": { "dev.ucp.shopping.order": [{"version": "2026-04-08"}] } },
  "checkout_id": "checkout_01",
  "currency": "USD",
  "line_items": [
    {
      "id": "line_1",
      "item": { "id": "product_123", "title": "Running Shoes", "price": 10000 },
      "quantity": { "total": 1, "fulfilled": 0 },
      "totals": [ {"type": "subtotal", "amount": 10000}, {"type": "total", "amount": 10000} ],
      "status": "processing"
    }
  ],
  "totals": [
    {"type": "subtotal", "display_text": "Subtotal", "amount": 10000},
    {"type": "fee", "display_text": "Service Fee", "amount": 100},
    {"type": "tax", "display_text": "Tax", "amount": 800},
    {"type": "total", "display_text": "Total", "amount": 10900}
  ],
  "fulfillment": {
    "expectations": [
      {
        "id": "exp_1",
        "line_items": [{"id": "line_1", "quantity": 1}],
        "method_type": "shipping",
        "destination": { "first_name": "Alice", "last_name": "Example", "street_address": "123 Main St", "address_locality": "Austin", "address_region": "TX", "address_country": "US", "postal_code": "78701" },
        "description": "Arrives in 2-3 business days",
        "fulfillable_on": "now"
      }
    ]
  },
  "permalink_url": "https://merchant.example.com/orders/789"
}
```

**Nota importante:** sempre inclua todos os line items, mesmo em checkouts de item único — isso garante que quaisquer add-ons, brindes ou cobranças separadas sejam contabilizados.

Mudanças na v2026-04-08 vs v2026-01-23: `currency` agora é obrigatório no nível superior do objeto Order; `type` dentro de `totals` é string aberta (`"subtotal"`, `"tax"`, `"fee"`, `"total"`); os campos `id`/`created_time` do payload foram substituídos pelos headers obrigatórios `Webhook-Id`/`Webhook-Timestamp`.

## 2.2 Eventos de fulfillment

Enviados como parte do array `fulfillment.events`.

- **`shipped`** — quando itens do pedido foram enviados. Incluir informação de rastreio se disponível (`tracking_number`, `tracking_url`, `carrier`).
- **`delivered`** — quando itens foram entregues.

**Pacote único, múltiplos itens:** quando vários itens são enviados juntos, agrupe-os num único evento `shipped` compartilhando o mesmo `tracking_number`, referenciando todos os `line_items` relevantes.

**Split shipment (múltiplos pacotes):** quando itens são enviados em pacotes separados, use múltiplos eventos `shipped`, cada um referenciando apenas os `line_items` daquele pacote específico, com `tracking_number` distintos. Como cada pacote representa um compromisso de fulfillment distinto (ex.: velocidades/custos diferentes vindos de um checkout com múltiplos grupos), as `expectations` também devem ser divididas correspondentemente.

## 2.3 Eventos de ajuste (`adjustments`)

Qualquer evento envolvendo movimentação de dinheiro deve ser enviado no array `adjustments`:

- **`cancellation`** — quando o pedido inteiro ou itens específicos são cancelados.
- **`return`** — quando itens são devolvidos pelo cliente.
- **`refund`** — quando um reembolso é emitido para o pedido ou itens específicos.

### Regras importantes (v2026-04-08):

- Line items afetados por `cancellation` usam `"status": "removed"` no array principal `line_items`.
- Quando `line_items.status` é `"removed"`:
  - `line_items.quantity.total` é definido como `0`.
  - A quantidade original é armazenada no novo campo `line_items.quantity.original`.
- Em ajustes do tipo `return`, o campo `line_items.quantity` dentro do ajuste usa valor **negativo** (ex.: `-1`) para indicar itens sendo devolvidos.
- Valores negativos em `totals`/`adjustments` (ex.: `amount: -29900`) indicam dinheiro retornado ao comprador.

### Exemplo — cancelamento + reembolso (v2026-04-08)

Headers: `Webhook-Id: adj_refund_1`, `Webhook-Timestamp: 2026-02-09T11:05:00Z`

```json
{
  "ucp": { "version": "2026-04-08", "capabilities": { "dev.ucp.shopping.order": [{"version": "2026-04-08"}] } },
  "checkout_id": "checkout_02",
  "currency": "USD",
  "line_items": [
    {
      "id": "line_2",
      "item": { "id": "product_456", "title": "Smart Watch", "price": 29900 },
      "quantity": { "total": 0, "original": 1, "fulfilled": 0 },
      "totals": [ {"type": "subtotal", "amount": 29900}, {"type": "tax", "amount": 2400}, {"type": "total", "amount": 32300} ],
      "status": "removed"
    }
  ],
  "totals": [ {"type": "subtotal", "amount": 29900}, {"type": "tax", "amount": 2400}, {"type": "total", "amount": 32300} ],
  "fulfillment": {
    "expectations": [
      { "id": "exp_1", "line_items": [{"id": "line_2", "quantity": 1}], "method_type": "shipping",
        "destination": { "first_name": "Bob", "last_name": "Consumer", "street_address": "456 Oak Ave", "address_locality": "Anytown", "address_region": "CA", "address_country": "US", "postal_code": "90210" },
        "description": "Standard Shipping", "fulfillable_on": "now" }
    ]
  },
  "adjustments": [
    { "id": "adj_cancel_1", "type": "cancellation", "description": "Customer changed mind", "line_items": [{"id": "line_2", "quantity": 1}], "occurred_at": "2026-02-09T11:00:00Z", "status": "completed" },
    { "id": "adj_refund_1", "type": "refund", "description": "Refund for cancelled item", "line_items": [{"id": "line_2", "quantity": 1}],
      "totals": [ {"type": "subtotal", "amount": -29900}, {"type": "tax", "amount": -2400}, {"type": "total", "amount": -32300} ],
      "occurred_at": "2026-02-09T11:05:00Z", "status": "completed" }
  ],
  "permalink_url": "https://merchant.example.com/orders/12345"
}
```

## 3. Eventos recomendados (não obrigatórios, mas melhoram a experiência)

- **Eventos de ajuste:** `dispute` — quando um cliente contesta uma cobrança.
- **Eventos de fulfillment:** `canceled` — quando um fulfillment é cancelado (enviado dentro do array `fulfillment.events`).
