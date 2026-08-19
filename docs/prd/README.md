# Indice de PRDs

## Discovery (Jira Product Discovery -> exportado)

- [PRD - Marca propria Industria24h (private label)](marca-propria-private-label.md)
- [PRD - Afiliado de Logistica (transporte por produto)](afiliado-logistica.md)
- [PRD - Curadoria de anuncio por IA (score de qualidade)](curadoria-anuncio-ia.md)
- [PRD - Leilao reverso entre fabricantes](leilao-reverso-fabricantes.md)
- [PRD - Roteirizacao automatica (Google Maps + WhatsApp + frete por CEP)](roteirizacao-automatica.md)
- [PRD - Centro de Distribuicao / Fulfillment](centro-distribuicao-fulfillment.md)
- [PRD - Contrato de fornecimento com preco travado](contrato-fornecimento-preco-travado.md)
- [PRD - Antecipacao de recebiveis para fabricantes](antecipacao-recebiveis.md)
- [PRD - Liquidacao relampago de excedente de estoque](liquidacao-relampago-excedente.md)
- [PRD - Compra coletiva entre compradores pequenos](compra-coletiva.md)
- [PRD - Impulsionamento pago de produtos (ads internos)](impulsionamento-ads-internos.md)
- [PRD - Mobilidade urbana on-demand (chamar motoristas e transportadoras)](mobilidade-urbana-on-demand.md)
- [PRD - Bling: lancamento de pedido](bling-lancamento-pedido.md)
- [PRD - Compra garantida (escrow)](compra-garantida-escrow.md)
- [PRD - Consolidacao de carga / rota](consolidacao-carga-rota.md)
- [PRD - Fluxo de frete completo](fluxo-frete-completo.md)
- [PRD - Integracao transportadoras: tracking, CT-e, Mercado Envios](integracao-transportadoras-tracking-cte-mercado-envios.md)
- [PRD - Percursos de entrega em lote (Mercado Envios extra)](percursos-entrega-lote-mercado-envios-extra.md)
- [PRD - Programa de confianca inicial do vendedor](programa-confianca-inicial-vendedor.md)
- [PRD - Roteirizacao: escopo do modulo geo](roteirizacao-escopo-modulo-geo.md)

## BPMN (processos de logistica)

- [PRD - Afiliado logistico (BPMN)](bpmn-afiliado-logistica.md)
- [PRD - Checkout: calculo de frete (BPMN)](bpmn-checkout-calculo-frete.md)
- [PRD - Corridas e despacho (BPMN)](bpmn-corridas-despacho.md)
- [PRD - Parceiro logistico (BPMN)](bpmn-parceiro-logistico.md)

## Lote de descontos IA

- [PRD 001 - Confirmacao de entrega por codigo do comprador](lote-descontos-001-confirmacao-entrega-codigo-comprador.md)

## Outros (sem numeracao, fora das secoes acima)

- [Engenharia reversa do checkout Mercado Livre](engenharia-reversa-checkout-mercadolivre.md)
- [Venda futura: devolucao parcial com fotos](venda-futura-devolucao-parcial-fotos.md)

---

**Nota (19/08/2026):** a antiga secao "Web (produto ativo, numerados)" (PRDs 001-004) foi
migrada para `docs/prds/` e renumerada para 020-023, consolidando com a numeracao sequencial
usada la desde 05/08/2026. Ver:

- [PRD 020 - Bot de atendimento](../prds/020-bot-atendimento.md)
- [PRD 021 - CRM: funil de leads](../prds/021-crm-funil-leads.md)
- [PRD 022 - Painel de corridas do parceiro de campo](../prds/022-painel-corridas-parceiro-campo.md)
- [PRD 023 - Sistema de repasse](../prds/023-sistema-repasse-asaas.md)

O PRD solto `pos-venda-disputas-workflow-mediacao.md` (sem numero, fora deste indice) foi
absorvido como anexo historico em [`docs/prds/009-pos-venda-disputas.md`](../prds/009-pos-venda-disputas.md#10-anexo-histórico--correção-de-workflow-e-mediação-10082026),
que ja cobria o mesmo modulo de forma estruturada.

Esta pasta (`docs/prd/`, singular) segue reservada para o legado nao-numerado (Discovery/Jira,
BPMN, Lote de descontos). Qualquer PRD novo do produto ativo entra em `docs/prds/` (plural),
seguindo a numeracao sequencial e o template com frontmatter ja em uso la.
