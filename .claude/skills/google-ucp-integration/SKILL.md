---
name: google-ucp-integration
description: Guia de implementação do Google Universal Commerce Protocol (UCP) — o padrão do Google para habilitar compras diretas e agênticas dentro do AI Mode do Google Search e do Gemini. Use esta skill sempre que o usuário mencionar "UCP", "Universal Commerce Protocol", "checkout no AI Mode", "vender pelo Gemini", "comércio agêntico com o Google", "perfil UCP", "/.well-known/ucp", integração de checkout nativo/embedded com Google, Identity Linking via OAuth2 para compras, webhooks de pedido do UCP, ou pedir para "criar/revisar/auditar" uma integração UCP para uma loja, marketplace ou plataforma de e-commerce específica. Também acione esta skill para dúvidas sobre AP2 (Agent Payments Protocol), Google Pay payment handler dentro do UCP, ou compatibilidade de UCP com MCP/A2A. Não é sobre o Model Context Protocol (MCP) genérico — se o pedido for sobre MCP sem relação com comércio/checkout, esta skill não se aplica.
---

# Google Universal Commerce Protocol (UCP) — Guia de Implementação

Fonte primária: [developers.google.com/merchant/ucp](https://developers.google.com/merchant/ucp) e suas subpáginas de implementação. Esta skill condensa esse conteúdo em um guia acionável para planejar, avaliar ou implementar uma integração UCP.

## O que é o UCP, em uma frase

Um padrão aberto e modular que permite que um negócio publique um "perfil" (manifesto JSON) declarando como aceita descoberta e checkout, para que o Google (AI Mode no Search e Gemini) — e potencialmente outros agentes — possam comprar produtos diretamente dentro da conversa, mantendo o vendedor como **Merchant of Record** (dono da transação, dos dados do cliente e do pós-venda).

## Quando usar esta skill

- O usuário quer entender o UCP antes de decidir se vale integrar.
- O usuário já decidiu integrar e precisa do passo a passo técnico (perfil, checkout, identidade, pedidos).
- O usuário está revisando/depurando uma integração UCP existente (ex.: erros de checkout, formato de webhook, assinatura de requisição).
- O usuário pergunta sobre compatibilidade do UCP com a stack dele (Shopify, marketplace próprio, ERP, MCP, A2A, AP2).
- O usuário pede para adaptar o UCP a um negócio específico que não é dos EUA (atenção: ver seção de "Escopo atual e limitações" abaixo — isso muda a resposta).

## Antes de qualquer coisa: escopo atual e limitações

Comunique isso proativamente sempre que o usuário estiver avaliando se deve investir na integração agora:

- O UCP está em fase inicial e o programa de integração com o Google exige **aprovação prévia** — não é self-service. É preciso entrar na waitlist (support.google.com/merchants/contact/ucp_integration_interest) e ter a integração aprovada pelo Google antes de ir ao ar no AI Mode/Gemini.
- Exige conta no **Google Merchant Center** com feed de produtos, frete e política de devolução configurados — sem isso não há descoberta.
- O modelo de pagamento nativo do Google dentro do UCP é o **Google Pay payment handler** (tokenização de cartão). Formas de pagamento locais fora do ecossistema de cartão/Google Wallet (ex.: Pix, boleto no Brasil) não têm caminho documentado nesta versão do guia — isso é um risco real de integração para negócios fora dos EUA/mercados de cartão maduro.
- Expandindo para novos verticais (hospedagem/Lodging e Food) via waitlists próprias — se o negócio do usuário for desses setores, mencione os links específicos em vez do fluxo genérico de shopping.
- **Não confundir com MCP genérico**: o UCP pode usar MCP como transporte, mas resolve um problema diferente (checkout/descoberta agêntica vs. acesso de agente a dados/ferramentas).

## Os dois caminhos de integração

| Caminho | Quando usar |
|---|---|
| **Native checkout** (padrão) | Negócio constrói 3 endpoints REST (criar/atualizar/completar sessão); Google renderiza a UI de checkout. Desbloqueia todo o potencial agêntico conforme o UCP evolui. |
| **Embedded checkout** | Caminho opcional, só para comerciantes aprovados com branding muito específico ou fluxos de checkout complexos que exigem solução via iframe. |

Na dúvida, recomende **Native** como default — é o caminho documentado em detalhe e o que o Google espera da maioria dos integradores.

## Passo a passo de implementação (visão de conjunto)

Siga esta ordem — cada etapa depende da anterior:

1. **Preparar o Merchant Center** — feed de produtos, frete, devoluções configurados. Depois disso, entrar na waitlist; a integração precisa ser aprovada pelo Google antes de ir ao ar.
2. **Configurar Google Pay** como payment handler (permite que o comprador pague com credenciais do Google Wallet).
3. **Publicar o perfil UCP** em `https://SEU-DOMINIO/.well-known/ucp` — arquivo JSON público, sem autenticação, que declara capabilities, versões, endpoints e chaves de assinatura. Ver `references/ucp-profile.md` para o schema completo e exemplos por versão.
4. **Implementar o checkout nativo** — os 3 endpoints REST (create/update/complete, mais cancel). Ver `references/checkout-api.md` para request/response completos, SLOs de latência/disponibilidade e tratamento de erros.
5. **Escolher identificação do usuário**:
   - Guest checkout (default, sem esforço extra), ou
   - Account-linked checkout via OAuth 2.0 (Identity Linking) — necessário para benefícios de fidelidade, ofertas personalizadas e checkout autenticado. Ver `references/identity-linking.md`.
6. **Sincronizar status de pedido** via webhook para o Google (criado, enviado, entregue, cancelamento/devolução/reembolso). Ver `references/order-lifecycle.md`.

## Como aplicar isto a um negócio real (não genérico)

Ao ajudar alguém a planejar a integração para um negócio específico, sempre adapte a resposta genérica acima considerando:

- **Modelo de negócio**: loja única vs. marketplace multi-vendedor. Marketplaces precisam decidir se o perfil UCP e as sessões de checkout são por vendedor ou centralizados na plataforma — isso não é resolvido automaticamente pelo protocolo, é uma decisão de arquitetura do integrador.
- **Stack atual**: se já existe uma API/MCP que expõe catálogo, pedidos e estoque, o trabalho de UCP é majoritariamente um "tradutor de protocolo" na frente dela, não um sistema novo do zero.
- **Meios de pagamento**: se o negócio depende de trilhos de pagamento fora do padrão de cartão/Google Wallet, sinalize isso como risco/lacuna antes de prometer uma integração completa.
- **Geografia**: confirme se o negócio tem operação nos mercados onde o programa já aceita integradores — isso muda com o tempo, então se o usuário perguntar sobre disponibilidade atual em um país específico, é um bom momento para sugerir busca na web em vez de responder só com o que está aqui.

## Arquivos de referência

- `references/ucp-profile.md` — schema completo do perfil UCP (`/.well-known/ucp`), exemplos JSON por versão da spec, capabilities, payment_handlers, signing_keys.
- `references/checkout-api.md` — os 4 endpoints do Checkout REST API (create/get/update/complete/cancel), exemplos de request/response multi-item, SLOs, códigos de erro e como reportar erros recuperáveis vs. não recuperáveis.
- `references/identity-linking.md` — OAuth 2.0 para Identity Linking, escopos obrigatórios, PKCE/S256, Google Streamlined Linking, metadata do authorization server.
- `references/order-lifecycle.md` — webhook de pedidos, autenticação/assinatura de requisição (HMAC ou RFC 9421), eventos obrigatórios (created/shipped/delivered) e eventos de ajuste (cancellation/return/refund).

Leia o arquivo de referência relevante antes de gerar qualquer JSON de exemplo, endpoint ou explicação técnica detalhada — os schemas mudam entre versões da spec (`2026-01-23` vs. `2026-04-08`) e citar a versão errada gera confusão para quem for implementar.
