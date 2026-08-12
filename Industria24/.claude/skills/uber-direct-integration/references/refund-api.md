# Refund Submission API — referência completa

Endpoint: `POST https://api.uber.com/v1/direct/{customer_id}/submit_refund`

**Exige acordo comercial separado com o representante de vendas da Uber Direct — não vem habilitado só por ter conta ativa.** Sempre sinalizar isso no bloco PENDENTE quando esta API entrar em escopo.

## Motivos de reembolso (enum fechado — nunca inventar um valor fora daqui)

| Código | Quando usar |
|---|---|
| `uber_never_received_order` | Pedido nunca chegou ao comprador, mesmo marcado como concluído |
| `uber_entire_order_wrong` | Comprador recebeu pedido totalmente errado |
| `uber_missing_items` | Um ou mais itens faltando (precisa listar em `items_missing`) |
| `uber_damaged_item` | Item chegou danificado |
| `uber_order_delivered_late` | Entregue fora da janela estimada |
| `uber_delayed_pick_up` | Entregador atrasou na coleta (anotar horário estimado em `notes`) |
| `uber_had_to_prepare_order_again` | Item precisou ser refeito/reembalado por atraso na coleta |
| `uber_never_pick_up` | Entregador nunca coletou o pedido |
| `uber_courier_cancelled` | Entregador cancelou e não há troca |
| `uber_safety_issue` | Item não atende critérios de segurança |
| `uber_return_trip_issue` | Retorno acionado e nunca chegou ao vendedor |

## Formato do valor — armadilha comum

O campo `amount` usa formato **e5**: `1/100000` da unidade monetária, **não** centavos.

- R$ 10,99 → `1099000`
- R$ 2,00 → `200000`

Sempre passar pela função `toE5Format()` (ver `service-layer-code.md`) em vez de calcular isso inline — bug de valor errado em reembolso é caro e silencioso.

## Request body

```json
{
  "delivery_id": "del_sU_JE_IkTASPLN0XXXXXXX",
  "requester_email_id": "admin@industria24h.com.br",
  "cc_email_ids": ["suporte@industria24h.com.br"],
  "refund_reason": "uber_missing_items",
  "items_missing": ["Pão Francês SevenBoys"],
  "notes": "Comprador reportou item faltando no pedido",
  "total_refund_amount": {
    "amount": 280000,
    "currency_code": "BRL"
  }
}
```

## Response (200)

```json
{
  "code": "OK",
  "message": "Successfully created a refund request"
}
```

Códigos possíveis: `OK`, `PERMISSION_DENIED`, `ALREADY_EXISTS`, `INVALID_ARGUMENT`, `INTERNAL`.

## Onde entra no fluxo do Industria24h

- Ação restrita a admin/seller — nunca expor esse endpoint direto ao comprador
- Tela de suporte em `apps/admin` (ou `apps/seller`) lista entregas com status problemático e permite abrir reembolso preenchendo motivo + valor
- Resultado (`code`/`message`) fica registrado vinculado à `Delivery` correspondente para histórico
