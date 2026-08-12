# Perfil UCP (`/.well-known/ucp`)

Fonte: https://developers.google.com/merchant/ucp/guides/ucp-profile

## O que é

O UCP usa uma arquitetura "server-selects": o negócio (servidor) escolhe a versão do protocolo e as capabilities a partir da interseção entre o que ele suporta e o que a superfície (Google) suporta. O **perfil UCP** (chamado "business profile" na spec) é o arquivo que permite ao Google negociar essas capabilities com o servidor do negócio.

- É um arquivo **JSON** hospedado no caminho bem conhecido: `/.well-known/ucp`
- **Deve ser público e não pode exigir autenticação**
- Deve ser mantido atualizado — é a fonte de verdade sobre o que o negócio suporta

## O que o perfil declara

- **Capabilities**: quais features UCP o negócio suporta (processos de checkout diferentes, opções de fulfillment, aplicação de descontos, gestão de pedidos).
- **Versões**: trava as versões específicas da spec e dos schemas usados.
- **Endpoints**: onde o Google deve enviar requisições de API para cada serviço.
- **Configuração de pagamento**: como o processamento de pagamento está configurado (ex.: parâmetros para Google Pay).
- **Chaves públicas**: usadas para verificar assinaturas de mensagens vindas do servidor do negócio (webhooks, etc.).

## Exemplo completo — versão `2026-04-08`

```json
{
  "ucp": {
    "version": "2026-04-08",
    "services": {
      "dev.ucp.shopping": [
        {
          "version": "2026-04-08",
          "spec": "https://ucp.dev/specification/overview",
          "transport": "rest",
          "endpoint": "https://business.example.com/ucp/v1",
          "schema": "https://ucp.dev/2026-04-08/services/shopping/rest.openapi.json"
        }
      ]
    },
    "capabilities": {
      "dev.ucp.shopping.checkout": [
        {
          "version": "2026-04-08",
          "spec": "https://ucp.dev/specification/checkout",
          "schema": "https://ucp.dev/2026-04-08/schemas/shopping/checkout.json"
        }
      ],
      "dev.ucp.shopping.fulfillment": [
        {
          "version": "2026-04-08",
          "spec": "https://ucp.dev/specification/fulfillment",
          "schema": "https://ucp.dev/2026-04-08/schemas/shopping/fulfillment.json",
          "extends": "dev.ucp.shopping.checkout"
        }
      ],
      "dev.ucp.shopping.discount": [
        {
          "version": "2026-04-08",
          "spec": "https://ucp.dev/specification/discount",
          "schema": "https://ucp.dev/2026-04-08/schemas/shopping/discount.json",
          "extends": "dev.ucp.shopping.checkout"
        }
      ],
      "dev.ucp.shopping.order": [
        {
          "version": "2026-04-08",
          "spec": "https://ucp.dev/latest/specification/order",
          "schema": "https://ucp.dev/2026-04-08/schemas/shopping/order.json"
        }
      ]
    },
    "payment_handlers": {
      "com.google.pay": [
        {
          "id": "8c9202bd-63cc-4241-8d24-d57ce69ea31c",
          "version": "2026-01-23",
          "spec": "https://pay.google.com/gp/p/ucp/2026-01-23/",
          "config_schema": "https://pay.google.com/gp/p/ucp/2026-01-23/schemas/config.json",
          "instrument_schemas": [
            "https://pay.google.com/gp/p/ucp/2026-01-23/schemas/card_payment_instrument.json"
          ],
          "config": {
            "api_version": 2,
            "api_version_minor": 0,
            "environment": "TEST",
            "merchant_info": {
              "merchant_name": "Example Merchant",
              "merchant_id": "01234567890123456789",
              "merchant_origin": "checkout.merchant.com"
            },
            "allowed_payment_methods": [
              {
                "type": "CARD",
                "parameters": {
                  "allowed_auth_methods": ["PAN_ONLY"],
                  "allowed_card_networks": ["AMEX", "DISCOVER", "JCB", "MASTERCARD", "VISA"],
                  "billingAddressRequired": true,
                  "billingAddressParameters": {
                    "format": "FULL",
                    "phoneNumberRequired": true
                  }
                },
                "tokenization_specification": {
                  "type": "PAYMENT_GATEWAY",
                  "parameters": {
                    "gateway": "example",
                    "gatewayMerchantId": "exampleGatewayMerchantId"
                  }
                }
              }
            ]
          }
        }
      ]
    }
  },
  "signing_keys": [
    {
      "kid": "business_2025",
      "kty": "EC",
      "crv": "P-256",
      "x": "WbbXwVYGdJoP4Xm3qCkGvBRcRvKtEfXDbWvPzpPS8LA",
      "y": "sP4jHHxYqC89HBo8TjrtVOAGHfJDflYxw7MFMxuFMPY",
      "use": "sig",
      "alg": "ES256"
    }
  ]
}
```

## Notas importantes

- O objeto `ucp` contém metadados do protocolo: `version`, `services`, `capabilities`. A configuração de pagamento (`payment_handlers`) é um **irmão** desse objeto, não um filho dele — não aninhe incorretamente.
- `signing_keys` é um array no formato **JWK** (JSON Web Key) — as chaves públicas usadas para verificar assinaturas em webhooks e outras mensagens autenticadas vindas do servidor do negócio.
- Existem duas versões de spec documentadas lado a lado: `2026-04-08` (mais recente) e `2026-01-23`. Ao gerar um perfil para alguém, pergunte (ou assuma, declarando a suposição) qual versão faz sentido — a mais nova traz mudanças em `checkout` (ver `checkout-api.md`) que não existem na anterior.
- `capabilities.dev.ucp.shopping.fulfillment` e `.discount` usam `"extends": "dev.ucp.shopping.checkout"` — isso é como o UCP modela capabilities que dependem/estendem outra capability em vez de serem standalone.

## Para negócios multi-vendedor (marketplaces)

A spec não define nativamente "um perfil por vendedor dentro de um marketplace" — isso é uma decisão de arquitetura de quem integra. Duas abordagens possíveis:
1. **Perfil único da plataforma**, com o endpoint de checkout roteando internamente para o vendedor correto com base no `item.id` recebido.
2. **Um endpoint/perfil por loja**, se cada vendedor tiver domínio ou subdomínio próprio — mais fiel ao modelo "Merchant of Record por vendedor", mas exige N publicações de `/.well-known/ucp` e N processos de aprovação separados junto ao Google.

Para a maioria dos marketplaces, a opção 1 é mais simples de operar; recomende-a como default, mas avise que a divisão de responsabilidade de "Merchant of Record" entre plataforma e vendedor precisa ficar clara nos termos de uso e no fluxo de disputa/reembolso.
