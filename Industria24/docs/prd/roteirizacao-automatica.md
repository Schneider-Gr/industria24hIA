# PRD - Roteirizacao automatica (Google Maps + WhatsApp + frete por CEP)

> Exportado do Confluence (espaco IND24H, page id 1015809) em 09/07/2026.

### Product overview

| **Target date** | A definir |
|---|---|
| **Document status** | DRAFT (atualizado em 28/07/2026 com o desenho do modulo `src/lib/geo`) |
| **Team members** | Andreia Schneider |

### Objective

Automatizar roteirizacao de entregas: calcular a rota via Google Maps, notificar o entregador por WhatsApp assim que uma rota e atribuida, acompanhar o status do trajeto, e precificar o frete automaticamente por faixa de CEP, eliminando o frete manual/10% ad valorem atual (KAN-14, KAN-21).

### Problem statement

Hoje nao ha calculo automatico de rota nem notificacao automatica ao entregador; a atribuicao e o aviso sao manuais, sem visibilidade de status em transito. O frete cobrado ao comprador e uma estimativa fixa (10% ad valorem), que nao reflete a distancia real nem varia por regiao, gerando risco de prejuizo em entregas longas e preco injusto em entregas curtas.

### Success metrics

| **Goal** | **Metric** |
|---|---|
| Frete justo e previsivel | Desvio entre frete cobrado e custo real de entrega |
| Tempo de resposta do entregador | Tempo entre atribuicao da rota e confirmacao pelo entregador via WhatsApp |
| Visibilidade de entrega | % de rotas com status atualizado (atribuida/em transito/entregue) |

### Requirements

| **Requirement** | **Importance** |
|---|---|
| Integracao Google Maps Directions/Distance Matrix API para calcular trajeto, distancia e tempo estimado | HIGH |
| Tabela de precificacao por faixa de CEP origem-destino, calculada automaticamente no checkout | HIGH |
| Disparo automatico via WhatsApp Business API para o entregador com a rota, ao ser atribuida | HIGH |
| Acompanhamento de status da rota: atribuida -> em transito -> entregue | MEDIUM |
| Painel do comprador mostra status da entrega em tempo real | LOW |

### Out of Scope

Rastreio GPS em tempo real do entregador (v1 usa confirmacao manual de status via WhatsApp); frota propria; modal fluvial (sem provedor de rota que atenda o Amazonas hoje).

**Revisao 28/07/2026:** otimizacao multi-parada saiu do out-of-scope. A consolidacao de carga (migration 0074) ja monta lote de N entregas no mesmo corredor de CEP e hoje o admin ordena as paradas no olho.

### Estado real em 28/07/2026 (confirmado no codigo)

Entregue: frete por faixa de CEP no checkout (`faixas_cep`, `checkout_criar_pedido`), disparo WhatsApp na atribuicao (`seller/rotas/actions.ts`, webhook Asaas), maquina de status da corrida (0039/0043/0048), consolidacao de carga (0074).

Nao entregue e coberto pelo escopo abaixo: calculo de trajeto confiavel, geocodificacao (nem `corridas` nem `rotas` tem lat/lng), teto de custo da API, ordenacao de paradas do lote.

Divida tecnica que motiva a revisao: `src/lib/maps.ts` usa a **Distance Matrix API, Legacy desde 01/03/2025**; devolve `null` tanto para "sem chave" quanto para "sem rota", o que impede a UI de cumprir a regra de "integracao pendente"; e lanca excecao em erro HTTP. Cinco callers com formatos de entrada diferentes (endereco completo, so CEP, CEP+endereco, GPS do parceiro) precisam do mesmo calculo.

### Requirements (revisao 28/07/2026)

| **Requirement** | **Importance** |
|---|---|
| Modulo `src/lib/geo` server-only substituindo `src/lib/maps.ts`, com resultado tipado que separa "sem chave" de "sem rota" | HIGH |
| Migracao Distance Matrix Legacy -> Routes API como troca de adapter, sem tocar em caller | HIGH |
| Geocodificacao persistida (lat/lng por CEP e por endereco), base de qualquer roteirizacao futura | HIGH |
| Teto de custo diario da API com bloqueio antes da chamada | HIGH |
| Cache de trajeto e de coordenada, para nao pagar duas vezes pelo mesmo par | MEDIUM |
| Ordenacao das paradas do lote de consolidacao (0074) na tela do admin | MEDIUM |
| Distancia por modal (moto, van, caminhao) usando `parceiros_logisticos.tipo` e capacidade | MEDIUM |
| Feed do parceiro ordenado por distancia do GPS ate as corridas abertas | LOW |

### Proposed solution

No fechamento do pedido, calcular trajeto origem (seller) - destino (comprador) via Google Maps Distance Matrix API, aplicar tabela de preco por faixa de CEP para definir o frete. Ao confirmar o pedido, atribuir a rota a um entregador/afiliado de logistica (ver MPDD-21) disponivel na regiao e disparar mensagem via WhatsApp Business API (mesma infra de MPDD-14) com origem, destino, valor da comissao e link do trajeto no Google Maps. Entregador confirma recebimento e atualiza status por WhatsApp ou painel simples. Reaproveita a maquina de estados de comissao ja definida em KAN-90.

### Ideia relacionada no Jira Product Discovery

Ver MPDD-22 no board de descoberta.



> Card ao vivo do Jira (ver na origem): https://andreiasworkspace-14440074.atlassian.net/issues/?jql=text%20~%20%22MPDD-22*%22%20or%20summary%20~%20%22MPDD-22*%22%20or%20key%20%3D%20MPDD-22%20ORDER%20BY%20created%20DESC
