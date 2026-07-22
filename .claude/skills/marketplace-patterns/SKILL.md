---
name: marketplace-patterns
description: Padrões de marketplace estilo Mercado Livre, Amazon e Alibaba — multiloja, seller, buy box, promoções, ads, reputação, logística, fees. Use ao desenhar ou avaliar qualquer feature de marketplace do Industria24h, comparar com concorrentes, ou quando o usuário pedir "como o ML/Amazon faz".
---

# Padrões de Marketplace (ML / Amazon / Alibaba)

Referência de domínio para desenhar features do Industria24h. Regra local primeiro: antes de importar um padrão, checar paridade Bubble (skill `paridade-bubble`) e o que já existe (skill `industria24-marketplace`). Padrão de gigante ≠ requisito nosso; é cardápio, não checklist.

## Catálogo e oferta

- **Produto ≠ oferta (ML/Amazon):** um catálogo canônico de produto com N ofertas de sellers competindo (buy box decidida por preço+frete+reputação). Industria24h hoje é 1 produto = 1 loja (modelo Alibaba/loja própria) — mudar isso é decisão de arquitetura grande, não feature.
- **Qualidade do anúncio (ML):** score por checklist — título, ficha técnica completa, fotos (fundo branco, N mínimas), GTIN, categoria correta. Já mapeado em `reference-ml-qualidade-anuncio-engenharia-reversa` e vira a IA de curadoria (MPDD-44). Anúncio ruim = menos ranking, não bloqueio.
- **Variações** (cor/tamanho/voltagem) num anúncio só; Alibaba adiciona **preço por faixa de quantidade** (B2B) — equivalente nosso: `preco_faixa` (pendente) e desconto progressivo (existente).
- Taxonomia: categoria fixa por produto + atributos filtráveis por categoria; breadcrumb = SEO.

## Seller

- **Ciclo:** cadastro → verificação (docs/CNPJ) → onboarding guiado → limite inicial de anúncios → reputação libera recursos. Nunca nasce "ativo" (nosso bug conhecido confirma o porquê).
- **Reputação (ML: verde/amarelo/vermelho):** métricas objetivas — % reclamações, % cancelamentos pelo seller, % atraso de despacho. Reputação afeta ranking e buy box. Nosso equivalente embrionário: `reputacao_seller`.
- **Central do seller:** dashboard de vendas, saúde dos anúncios, perguntas, promoções, repasses. Amazon adiciona "Account Health" com limites explícitos antes de suspensão.
- **SLA de despacho** com data-limite visível; atraso pesa na reputação e no ranking.

## Dinheiro

- **Fee model:** comissão % por categoria (ML 10-19%, Amazon 8-15%) + tarifa fixa por item barato + fulfillment opcional. Nosso: 5% flat — simples, mas por categoria é a evolução natural (já discutido em MPDD-37).
- **Repasse:** retenção até entrega confirmada + janela de disputa; libera parcial por item, não por pedido. Chargeback/estorno debita do saldo do seller. Nosso repasse PIX deve respeitar isso (decisões pendentes do dono).
- **Antecipação de recebíveis** como receita da plataforma (Asaas tem nativo — MPDD-34).

## Promoções e Ads

- Tipos padrão: desconto de seller, cupom (plataforma ou seller, quem paga fica explícito), desconto progressivo/atacado (Alibaba), campanha sazonal com opt-in do seller, frete grátis acima de X (custo dividido).
- **Preço riscado honesto:** "de X por Y" exige X real praticado (menor preço dos últimos 30d) — requisito legal BR (CDC), não opcional.
- **Ads internos (ML Product Ads / Amazon Sponsored):** leilão de CPC nos gigantes; nossa fase 1 é taxa fixa por categoria via "Impulsionar" descontado do recebível (MPDD-37, ver `feedback-benchmark-ads-marketplaces-ml-amazon`).

## Descoberta

- Busca tolerante a erro + autocomplete + filtros por atributo; ranking mistura relevância, conversão, reputação, frete e ads (slots patrocinados marcados).
- Recomendação: "quem viu também viu", recompra recorrente (B2B/insumos é o nosso caso forte), carrinho abandonado.

## Logística

- Modelos: seller entrega (nosso atual) → coleta/drop-off → fulfillment (estoque no CD da plataforma, MPDD-31). Rastreio com eventos padronizados é o mínimo (PRD transportadoras draft).
- Frete calculado no anúncio E no carrinho; cobertura por CEP (nosso já tem); prazo prometido vira SLA medido.

## Confiança

- Avaliações só de comprador verificado, por produto E por seller (MPDD-11).
- Perguntas & respostas públicas no anúncio — motor de conversão nº1 do ML; nosso equivalente atual é WhatsApp (perde o histórico público/SEO).
- Proteção ao comprador: mediação com prazos, devolução, dinheiro de volta — nossa regra de disputa está PENDENTE (perguntar, não assumir).
- Antifraude: velocity de pedidos, CPF/CNPJ validado, device; crew antifraude publicada (skill `crews-ia`).

## Anti-padrões (não copiar sem necessidade)

Buy box no dia 1 (exige catálogo canônico) · leilão de ads no dia 1 · fulfillment antes de volume · fee complexo antes de PMF · réplica de UI do ML sem a mecânica por trás (badge de reputação sem métrica real é teatro).
