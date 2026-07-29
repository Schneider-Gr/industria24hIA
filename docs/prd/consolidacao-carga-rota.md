# PRD - Consolidacao de carga por rota (frete compartilhado)

> Exportado do Confluence (espaco IND24H, page id 6225921) em 23/07/2026. Ideia Jira: MPDD-46.

### Product overview

| Target date | A definir |
|---|---|
| Document status | DRAFT |
| Team members | Andreia Schneider |

Consolidacao de carga por rota: pedidos de compradores diferentes com destino no mesmo corredor de CEP compartilham um veiculo em janelas de saida, dividindo o custo do frete. Camada sobre o trio logistico: afiliado de logistica (MPDD-21), roteirizacao (MPDD-22) e frete por CEP por loja (#28/#60).

### Objective

Reduzir o maior custo do B2B amazonico (frete) e criar ativo defensavel: malha de corredores, densidade de pedidos e historico de SLA de transportadores que concorrente nacional nao replica.

### Problem statement

Cada pedido contrata frete individual. Comprador pequeno paga frete proporcionalmente alto; seller perde vendas fora do raio economico; transportador roda com capacidade ociosa.

### Success metrics

| Goal | Metric |
|---|---|
| Frete mais barato | Reducao media do frete consolidado vs individual (meta >= 30%) |
| Adocao | % de pedidos elegiveis que optam por consolidado |
| Atratividade para transportador | Receita por km em lote vs corrida avulsa |
| Efeito de rede | Novos compradores por corredor (mais compradores = frete menor) |

### Requirements

| Requirement | Importance |
|---|---|
| Peso/volume no cadastro de produto (verificar campos atuais; Bubble tinha parcialmente) | HIGH |
| Janelas de consolidacao por corredor de CEP (origem loja → faixa destino, estrutura do #28) | HIGH |
| Escolha no checkout: frete individual (sai ja) vs consolidado (mais barato, proxima janela), desconto explicito | HIGH |
| Job de agrupamento por corredor + soma de volume ate capacidade do veiculo (roteirizacao fina do MPDD-22 fica para depois) | MEDIUM |
| Oferta do lote a afiliados de logistica / motoristas avulsos como manifesto unico, aceite via WhatsApp | HIGH |
| Rateio do frete proporcional a peso/volume com margem da plataforma; pagamento pelo trilho do repasse PIX | HIGH |
| Rastreio por parada atualiza o pedido correspondente via despacho automatico; comprador ve so o pedido dele | MEDIUM |

### Out of scope

- Roteirizacao otimizada multi-parada na v1 (agrupamento por corredor basta)
- Agrupamento automatico na v1: admin monta o lote com 1 clique (manual-assistido) ate haver volume
- Frete interestadual multimodal (balsa/aereo) na v1

### Proposed solution

V1 manual-assistida: painel admin lista pedidos pendentes agrupaveis por corredor; admin monta o lote; sistema faz rateio, oferta ao transportador e notificacoes. Dependencias: peso/volume no cadastro, afiliado de logistica operante, PR #43 (repasse PIX) em producao. Acopla com Compra Garantida (MPDD-45): confirmacao de cada parada do lote libera o escrow do pedido correspondente.

Fluxo: pedido entra na janela do corredor → job (ou admin na v1) agrupa por faixa de CEP + peso/volume + origem → lote ofertado a rede de transportadores como manifesto unico → aceite → rateio proporcional entre pedidos com margem → entrega por parada atualiza cada pedido → pagamento ao transportador pelo trilho de repasse.

Por que e defensavel: o ativo e a malha (corredores com volume, SLA por transportador, densidade por bairro industrial de Manaus), nao o software. Efeito de rede raro: cada comprador novo num corredor baixa o frete dos demais, dando motivo para compradores recrutarem compradores.
