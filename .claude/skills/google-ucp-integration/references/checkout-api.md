# Checkout REST API (Native Checkout)

Fonte: https://developers.google.com/merchant/ucp/guides/checkout/native

## Fluxo geral

1. **Construir sessão de checkout**: usuário (e opcionalmente um agente) adicionam itens à sessão, em loop.
2. **Handoff para a UI do Google**: quando o usuário decide fechar a compra, o agente (se envolvido) passa o controle para uma UI do Google, levando os dados da sessão de checkout.
3. **Checkout manual**: o usuário interage só com a UI do Google para preencher dados sensíveis de entrega/pagamento e enviar o pedido. O agente não participa dessa parte — isso garante determinismo.
4. **Conclusão e retorno**: a UI do Google mostra uma página de confirmação. Opcionalmente, o usuário pode ser redirecionado de volta ao agente, que pode já ter sido notificado da compra concluída.

## Ferramentas de desenvolvimento

- Repositório principal: https://github.com/Universal-Commerce-Protocol/ucp
- SDKs: [Python](https://github.com/Universal-Commerce-Protocol/python-sdk), [JavaScript](https://github.com/Universal-Commerce-Protocol/js-sdk)
- Suíte de testes de conformidade: https://github.com/Universal-Commerce-Protocol/conformance — valide os endpoints contra a spec antes de considerar a integração pronta.

## SLOs (Service Level Objectives) exigidos

| Endpoint | Disponibilidade | Latência p50 | Latência p95 |
|---|---|---|---|
| `POST /checkout-sessions` (Create) | ≥ 95% | ≤ 1s | ≤ 4s |
| `PUT /checkout-sessions/{id}` (Update) | ≥ 95% | ≤ 1s | ≤ 5s |
| `POST /checkout-sessions/{id}/complete` (Complete) | ≥ 95% | ≤ 6s | ≤ 10s |

Negócios integrados com o Google devem atender essas metas de performance e disponibilidade — trate isso como requisito não-funcional de infraestrutura, não como detalhe opcional.

**Nota:** Google inclui um header `Authorization: Bearer <access_token>` nas requisições a esses endpoints — usado tanto para autenticação machine-to-machine quanto para Identity Linking.

## Fluxo de checkout multi-item

Suporte a múltiplos line items distintos numa única sessão:

1. Usuário inicia checkout (ex.: clica "Buy now" num produto).
2. `POST /checkout-sessions` é chamado, incluindo todos os itens distintos no array `line_items` (um objeto por item único).
3. Usuário pode atualizar instrumento de pagamento, dados de entrega ou aplicar descontos via `PUT /checkout-sessions/{id}`.
4. Ao clicar "Pay with GPay", `POST /checkout-sessions/{id}/complete` é chamado.

(Ajuste de quantidade dentro das superfícies do Google ainda não é suportado — "coming soon" no momento da documentação.)

---

## 1. Criar sessão de checkout

- **Endpoint:** `POST /checkout-sessions`
- **Trigger:** usuário clica "Buy now" num produto ou "Checkout on Google" no carrinho.
- **Request:** Google envia os line items e informação limitada de endereço do comprador (cidade, estado, CEP).

```json
{
  "line_items": [
    { "item": { "id": "product_12345" }, "quantity": 1 },
    { "item": { "id": "product_67890" }, "quantity": 1 }
  ],
  "fulfillment": {
    "methods": [
      {
        "type": "shipping",
        "destinations": [
          { "address_locality": "Sunnyvale", "address_region": "CA", "postal_code": "94089", "address_country": "US" }
        ]
      }
    ]
  }
}
```

- **Response:** sessão inicializada com totais, impostos (inicialmente estimados) e capabilities de pagamento. **Obrigatório**: incluir no array `links` URLs para `privacy_policy` e `terms_of_service` — são exigidos para exibição na UI de checkout do Google.

Na versão `2026-04-08`, a resposta inclui um campo `ucp.status`:
- `"success"` (ou omitido) — default; sessão criada, mesmo com `messages` recuperáveis.
- `"error"` — falha não recuperável na criação (ex.: todos os itens fora de estoque). Nesse caso o corpo deve ser um **Error Response object**, não um objeto Checkout (ver seção de erros abaixo).

Exemplo de resposta (v2026-04-08, resumido):

```json
{
  "ucp": { "version": "2026-04-08", "status": "success", "capabilities": {"...": "..."} },
  "id": "bf8c1b4b-6b1c-4c6a-8f2a-53c2a7c3b2e1",
  "status": "incomplete",
  "messages": [
    { "type": "error", "code": "missing_buyer_info", "path": "$.buyer", "content_type": "plain", "content": "Buyer information is required for checkout", "severity": "recoverable" }
  ],
  "currency": "USD",
  "line_items": [ { "id": "line_1", "item": {"id": "product_12345", "title": "Running Shoes", "price": 10000}, "quantity": 1, "totals": [ {"type": "subtotal", "amount": 10000}, {"type": "total", "amount": 10000} ] } ],
  "totals": [
    { "type": "subtotal", "display_text": "Subtotal", "amount": 12500 },
    { "type": "fee", "display_text": "Fees", "amount": 549, "lines": [ {"display_text": "Service Fee", "amount": 399}, {"display_text": "Recycling Fee", "amount": 150} ] },
    { "type": "fulfillment", "display_text": "Shipping", "amount": 0 },
    { "type": "tax", "display_text": "Estimated Tax", "amount": 1050 },
    { "type": "total", "display_text": "Total", "amount": 14099 }
  ],
  "links": [
    { "type": "terms_of_service", "url": "https://m.com/terms", "title": "Terms of Service" },
    { "type": "privacy_policy", "url": "https://m.com/privacy", "title": "Privacy Policy" }
  ]
}
```

Mudanças na v2026-04-08 vs v2026-01-23: o campo `type` dentro de cada objeto do array `totals` agora é uma string aberta; `amount` pode ser negativo (ex.: para representar descontos); objetos com `type: "fee"` podem incluir um array `lines` para detalhar componentes da taxa.

## 2. Obter sessão de checkout

- **Endpoint:** `GET /checkout-sessions/{id}`
- **Request:** Google envia o ID da sessão. Se IDs globais forem usados (ex.: `gid://merchant.example.com/Checkout/session_abc123`), o ID no path da requisição será só o último componente (`session_abc123`).
- **Response:** objeto checkout completo. Para sessões multi-item, `line_items` contém múltiplas entradas.

## 3. Atualizar sessão de checkout

- **Endpoint:** `PUT /checkout-sessions/{id}`
- **Trigger:** usuário seleciona/altera endereço de entrega, instrumento de pagamento, etc. — ao atualizar o endereço, é obrigatório recalcular e retornar impostos e opções de frete.

Exemplo de request (atualização de endereço, v2026-04-08):

```json
{
  "line_items": [
    { "id": "line_1", "item": {"id": "product_12345"}, "quantity": 1 },
    { "id": "line_2", "item": {"id": "product_67890"}, "quantity": 1 }
  ],
  "fulfillment": {
    "methods": [
      {
        "type": "shipping",
        "line_item_ids": ["line_1", "line_2"],
        "destinations": [ { "address_locality": "Mountain View", "address_region": "CA", "postal_code": "94043", "address_country": "US" } ],
        "groups": [ { "id": "group1", "line_item_ids": ["line_1", "line_2"], "options": [{"id": "ship_ground"}], "selected_option_id": "ship_ground" } ]
      }
    ]
  }
}
```

Ao clicar "Pay with GPay", Google envia o objeto checkout completo hidratado (com endereço completo de entrega e dados do comprador) para uma última atualização antes de completar.

## 4. Completar sessão de checkout

- **Endpoint:** `POST /checkout-sessions/{id}/complete`
- **Trigger:** usuário clica "Pay with GPay" e Google recebe resposta bem-sucedida da hidratação completa do checkout.
- **Request:** Google envia o instrumento de pagamento selecionado do payment handler, incluindo a credencial (ex.: dados de tokenização do Google Pay) e sinais de risco sobre o comprador, para o negócio fazer sua própria detecção de fraude.

```json
{
  "payment": {
    "instruments": [
      {
        "billing_address": { "first_name": "John", "last_name": "Buyer", "street_address": "1600 Amphitheatre Pkwy", "address_locality": "Mountain View", "address_region": "CA", "postal_code": "94043", "address_country": "US" },
        "credential": { "token": "examplePaymentMethodToken", "type": "PAYMENT_GATEWAY" },
        "display": { "brand": "VISA", "description": "Visa •••• 1234", "last_digits": "1234" },
        "handler_id": "8c9202bd-63cc-4241-8d24-d57ce69ea31c",
        "id": "94e7fee0-1a82-4c2a-9ef4-0861a3c829b2",
        "selected": true,
        "type": "CARD"
      }
    ]
  },
  "signals": {}
}
```

Ao receber um instrumento de pagamento Google Pay, o negócio deve:
1. **Validar o handler**: confirmar que `handler_id` corresponde ao payment handler do Google Pay.
2. **Extrair o token**: recuperar o token de pagamento gerado em `payment_data.credential.token`.
3. **Processar o pagamento**: usar o token e detalhes da transação para completar o pagamento (via especificação de tokenização do Google Pay).

Se faltar informação obrigatória (ex.: e-mail do comprador), retorne `status: "incomplete"` com uma ou mais `messages` de `severity: "recoverable"`, indicando o que falta — o Google pode então coletar essa informação via campos definidos pelo UCP.

- **Response (sucesso):** objeto checkout completo com `status: "completed"`, incluindo o ID do pedido e uma URL permalink:

```json
{
  "id": "da2e25ec-eef8-41b7-a439-4e62dea41bdc",
  "status": "completed",
  "order": { "id": "ORD1773956535.2727807", "label": "#100", "permalink_url": "https://merchant.example.com/orders/789" }
}
```

## 5. Cancelar sessão de checkout

- **Endpoint:** `POST /checkout-sessions/{id}/cancel`
- **Request:** Google envia o ID da sessão.
- **Response:** objeto checkout completo com `status` atualizado para `"canceled"`.

---

## Tratamento de erros

Como reportar depende do tipo de erro:

**1. Erros de protocolo/servidor**
Use códigos HTTP padrão (4xx para erro de cliente, 5xx para erro de servidor) — requisição malformada, falha de autenticação, indisponibilidade do servidor.

**2. Erros/avisos de lógica de negócio**
Retorne **HTTP 200 OK**. Descreva o problema no array `messages` do corpo JSON. Cada objeto deve incluir:
- `type`: `"error"` ou `"warning"`
- `code`: código padronizado (ver Error Codes guide oficial — não use códigos genéricos como `"invalid"`)
- `content`: descrição legível por humanos
- `severity`: obrigatório quando `type` é `"error"` — `"unrecoverable"` (terminal) ou `"recoverable"` (permite pedir correção ao comprador)

**Nota de versão:** `ucp.status` só existe a partir da versão `2026-04-08`. Em `2026-01-23` ou anteriores, reporte erros não recuperáveis apenas via array `messages`.

**Exemplo — erro não recuperável (v2026-04-08+)**, ex.: todos os itens fora de estoque. Retorne HTTP 200 OK com `"status": "error"` dentro do objeto `ucp`. Nenhum ID de sessão é retornado:

```json
{
  "ucp": { "version": "2026-04-08", "status": "error" },
  "messages": [
    { "type": "error", "code": "out_of_stock", "content": "All requested items are currently out of stock", "severity": "unrecoverable" }
  ],
  "continue_url": "https://merchant.com/"
}
```

Sempre use os códigos padronizados do guia oficial de Error Codes (`developers.google.com/merchant/ucp/guides/checkout/errorcode`) para questões de lógica de negócio — isso garante que o Google processe a resposta corretamente e dê o feedback certo ao usuário.
