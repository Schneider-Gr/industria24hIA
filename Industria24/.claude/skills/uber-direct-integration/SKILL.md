---
name: uber-direct-integration
description: Padrão de integração com a API Uber Direct (cotação, criação de entrega, tracking e reembolso) para o marketplace Industria24h. Use esta skill SEMPRE que o usuário mencionar "Uber Direct", "entrega", "delivery", "cotação de frete", "tracking de pedido", "reembolso de entrega", "refund da Uber", ou pedir para adicionar/estender a integração de entregas do projeto — mesmo que não cite "Uber Direct" explicitamente, se o contexto for entrega no mesmo dia / 24h do Industria24h, esta skill se aplica. Também use ao criar um novo provider de entrega (ex. Loggi, Lalamove) seguindo o mesmo padrão arquitetural já estabelecido aqui.
---

# Integração Uber Direct — Industria24h

Este skill documenta o padrão já decidido e implementado (ver `INTEGRACAO_UBER_DIRECT.md` do projeto) para usar o Uber Direct como provider de entrega no Industria24h. Segue o protocolo geral do `protocolo-sessao-dev`: schema → service → controller → UI, decisões técnicas com pros/cons + recomendação, e bloco `⚠️ PENDENTE` para o que depende de decisão da Andreia.

## Decisão arquitetural (já tomada — não reabrir sem justificativa nova)

**Híbrido por categoria**, não Uber Direct pra tudo:
- Uber Direct: Ofertas Relâmpago, Supermercado/Hortifruti, Eletrônicos leves, Cestas & Assinaturas — itens leves, entrega no mesmo dia, reforça a identidade "24h" do site.
- Transportadora tradicional: itens industriais pesados, Venda Futura, Vestuário em volume — fora do limite de peso/dimensão do Uber Direct.

A seleção de provider é uma função pura e testável (`selectProviderType(order)`), separada da lógica de checkout — nunca acoplar a escolha do provider direto no componente de UI.

## Onde o código vive

```
services/
  delivery/
    types.ts       # interfaces comuns: Address, QuoteResult, DeliveryResult, RefundRequest, RefundResult
    uberDirect.ts   # implementação Uber Direct (auth, quote, create, status, refund)
    index.ts        # selectProviderType() + getProvider() factory
```

Consumido por: checkout em `apps/web`, status/tracking em `apps/seller`, refunds em `apps/admin`.

Para o código completo pronto para colar, ver `references/service-layer-code.md`.

## Fluxo padrão (quote → create → track)

1. Comprador informa endereço → `POST /api/delivery/quote` → `selectProviderType()` decide o provider → se Uber Direct, chama `createQuote()` → mostra fee + ETA
2. Pagamento confirmado (webhook Asaas/PagBank) → `POST /api/delivery/create` com o `quoteId` salvo → grava registro `Delivery`
3. `trackingUrl` retornado fica disponível pro comprador
4. Webhook Uber Direct (`/api/webhooks/uber-direct`) atualiza `Delivery.status` → realtime Supabase reflete na UI, igual ao padrão já usado no projeto

Sempre validar a assinatura do webhook antes de processar — nunca confiar no payload sem verificação.

## Auth

Token OAuth via `client_credentials`, cacheado em memória com expiração (não pedir token novo a cada chamada). Client ID/Secret/Customer ID **só** em env var do Vercel, nunca expostos no client. Ver `references/service-layer-code.md` para o padrão de cache de token.

## Schema (Prisma)

Modelos `DeliveryQuote` e `Delivery`, enums `DeliveryProviderType` e `DeliveryStatus`. Ver `references/prisma-schema.md`.

⚠️ Sempre confirmar o nome real do model `Order` no schema atual antes de aplicar migration — não assumir nomes especulativos (mesma regra do reverse-engineering do Bubble: nomes reais de `Loja_ecommerce`, `Produto_ecommerce` etc. sempre têm prioridade sobre suposição).

## Refund API — cuidado especial

A API de reembolso (`POST /v1/direct/{customer_id}/submit_refund`) é **separada** da API de delivery e **não vem habilitada por padrão** — exige acordo comercial à parte com o representante de vendas da Uber Direct. Se o usuário pedir para implementar reembolso, escreva o código normalmente mas deixe claro no `⚠️ PENDENTE` que precisa desse contato comercial antes de funcionar em produção.

Motivos de reembolso são um enum fechado (`uber_missing_items`, `uber_order_delivered_late`, etc.) — nunca inventar um motivo fora da lista. Ver `references/refund-api.md` para a lista completa e o código.

**Armadilha de formato:** o valor do reembolso usa formato **e5** (1/100000 da unidade monetária), não centavos. R$ 10,99 = `1099000`, não `1099`. Sempre isolar essa conversão numa função utilitária (`toE5Format`) em vez de espalhar a matemática pelo código — é o tipo de bug silencioso que gera reembolso com valor 100x errado.

## Segurança (checklist rápido)

- `UBER_DIRECT_CLIENT_SECRET` só em env var do servidor, nunca no client
- Validar assinatura de todo webhook antes de escrever no banco
- RLS deny-by-default na tabela `Delivery`: comprador só vê o próprio pedido, vendedor só vê pedidos da própria loja, admin vê tudo
- Reembolso é ação restrita a admin/seller — nunca expor o endpoint de refund direto ao comprador

## Ao estender para outro provider de entrega

Se pedirem para adicionar Loggi, Lalamove, etc., seguir a mesma interface `DeliveryProvider` em `types.ts` — isso é o que mantém `selectProviderType()` e o checkout desacoplados de qual provider está por trás. Não criar um caminho especial só pro novo provider; implementar a interface e registrar na factory `getProvider()`.

## Sempre fechar com o bloco PENDENTE

Qualquer trabalho nesta área que toque em: criação de conta/credenciais reais, limites de peso/dimensão não confirmados, decisão de quais categorias entram no Uber Direct, ou habilitação da Refund API — vai para o bloco `=== ⚠️ PENDENTE: ===` no final da resposta, com uma recomendação de uma linha cada, seguindo o padrão do projeto.
