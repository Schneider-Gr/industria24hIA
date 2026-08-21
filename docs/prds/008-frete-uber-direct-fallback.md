---
prd_number: "008"
status: rascunho
priority: média
created: 2026-08-03
issue: "364"
depends_on: ["001"]
references:
  - "docs/prd/mobilidade-urbana-on-demand.md" – PRD do módulo Parceiro Logístico (fallback interno que este PRD complementa)
  - "supabase/migrations/0039_parceiro_logistico_schema.sql" – schema do módulo Parceiro Logístico
  - "https://developer.uber.com/docs/deliveries" – documentação oficial Uber Direct
  - "https://developer.uber.com/docs/deliveries/guides/webhooks" – verificação de assinatura de webhook
  - "https://github.com/Schneider-Gr/industria24hIA/pull/365" – implementação do Milestone 1
  - "https://github.com/Schneider-Gr/industria24hIA/issues/364" – pendências operacionais
  - "openspec/changes/uber-direct-checkout-milestone1/" – proposal/specs/design/tasks do Milestone 1
---

# PRD 008: Frete via Uber Direct como fallback de entrega

## 1. Contexto

- **Produto/área**: Checkout e logística do marketplace industria24.com.br.
- **Estado atual**: o frete de um pedido hoje depende de duas vias — afiliado de logística vinculado ao produto, ou o módulo Parceiro Logístico (motoristas/transportadoras cadastrados no marketplace, matching por aceite ou leilão reverso — ver PRD `mobilidade-urbana-on-demand.md`). Quando nenhuma das duas cobre a rota, região ou horário, a venda se perde por falta de frete disponível mesmo com produto e comprador prontos para fechar.
- **Problema**: gap de cobertura geográfica/temporal do frete. Este PRD não substitui os mecanismos existentes — adiciona uma terceira via, terceirizada, para os casos em que as duas primeiras não resolvem.

> **Contexto técnico** (integração OAuth, endpoints Uber Direct, armazenamento de credenciais) vive no TRD, carregado na implementação. Onboarding da conta Uber Direct (criação de conta, billing, geração de `client_id`/`client_secret`/`customer_id`) é pré-requisito operacional, não faz parte deste documento.

## 2. Solução Proposta

### Visão de produto

- No checkout, se não houver afiliado logístico nem parceiro logístico disponível para a rota do pedido, o sistema cota automaticamente uma entrega via Uber Direct e oferece como opção de frete.
- O comprador vê o preço e prazo cotados e escolhe aceitar ou não essa opção de frete no momento do checkout.
- Após pagamento confirmado, o sistema despacha a entrega junto à Uber Direct usando o endereço do vendedor como coleta e o endereço do comprador como entrega.
- Comprador e vendedor acompanham o status da entrega (a caminho, coletado, entregue) refletido no pedido.

### Decisões de produto

1. Uber Direct entra **apenas como fallback**, avaliado depois que afiliado logístico e parceiro logístico já foram checados e não cobriram a rota. *(premissa — confirme ou corrija)* — motivo: preserva a arquitetura de fallback em camadas já descrita no PRD do Parceiro Logístico, evitando canibalizar os dois mecanismos internos.
2. O valor cotado pela Uber Direct é repassado integralmente ao comprador, sem markup da plataforma. *(premissa — confirme ou corrija)* — motivo: ainda não há decisão de precificação; alternativa (markup ou absorção parcial) fica registrada como pendência em §7.
3. O pickup usa o endereço cadastrado do vendedor/loja como está hoje no cadastro. *(premissa — confirme ou corrija)* — depende de validação de que o cadastro de endereço do seller tem granularidade suficiente (rua, número, CEP) para virar `pickup address` da Uber Direct; ver Edge case em US01.
4. Cotação e despacho usam a Direct API (DaaS) da Uber, não Courier Pick & Pack nem Rides. *(premissa — confirme ou corrija)*

### Reconciliação com `transportadoras` (achado durante implementação, 2026-08-03)

> Enquanto este PRD estava em implementação, um PR concorrente (`0099_transportadoras.sql`, `0101_checkout_transportadora.sql`) mergeou em master um mecanismo genérico de transportadora selecionável no checkout: tabela `transportadoras` com `fonte in ('interna', 'mercado_envios')`, `checkout_criar_pedido` já aceita `entrega->>'transportadora_id'`, valida cobertura por loja e casa tarifa em `faixas_cep.transportadora_id`. `fonte='mercado_envios'` já está reservado no schema para cotação externa, mas o RPC hoje recusa qualquer `fonte <> 'interna'` (`raise exception 'Cotação externa (Mercado Envios) ainda não disponível no checkout.'`) — Uber Direct cairia no mesmo bloqueio.

Esse é o encaixe correto para US01 (cotação e escolha **antes** do pagamento), e substitui a arquitetura originalmente pensada neste PRD (cascata afiliado → parceiro logístico → Uber Direct decidida no backend). Plano para destravar Milestone 1 em cima do que já existe:

1. Cadastrar Uber Direct como linha em `transportadoras` (`fonte = 'uber_direct'` — exige `alter table` para adicionar o valor ao `check`, hoje só aceita `'interna'`/`'mercado_envios'`) em vez de reservar `'mercado_envios'` para ela.
2. No checkout (client), quando a transportadora escolhida for `fonte = 'uber_direct'`, chamar `cotarEntrega()` (já existe em `src/lib/uber-direct.ts`) para exibir preço/prazo antes da confirmação — cotação acontece no client/API route, não dentro do RPC `checkout_criar_pedido` (que é `plpgsql`, sem acesso a rede).
3. `checkout_criar_pedido` (0101) precisa de um terceiro branch de `v_transp_fonte` (hoje só trata `'interna'`, rejeita o resto) para aceitar `'uber_direct'` sem exigir `faixas_cep` — o frete vem do valor cotado, passado como parâmetro, não calculado por `percentual`.
4. `despacharUberDirectSeElegivel` (hoje em `api/asaas/webhook/route.ts`, disparado por heurística "nenhuma rota criada") passa a disparar apenas quando `linha_itens.transportadora_id` aponta para a transportadora Uber Direct — sinal explícito, elimina o risco de falso positivo registrado em §7.
5. Decisão em aberto: se Uber Direct só aparece como opção quando afiliado/parceiro logístico não cobrem a rota (fallback estrito, decisão de produto 1 abaixo) ou se vira uma transportadora normal sempre visível ao lado das outras — o schema de `transportadoras` não distingue "fallback" de "opção regular" nativamente. *(premissa — confirme ou corrija)*

Não implementado nesta rodada — registrado aqui como plano, não como trabalho feito. Ver Milestone 1 (status: não iniciado) e decisão de 2026-08-03 no Registro de Decisões.

### Fora do escopo

- Despacho manual pelo seller/admin fora do fluxo de checkout (ex.: botão avulso no painel do vendedor). *(premissa — confirme ou corrija)* — pode virar PRD futuro se o checkout automático não cobrir os casos de uso do dono.
- Transporte de passageiros ou qualquer modal fora de encomendas/carga leve.
- Integração com Uber for Business ou qualquer produto Uber além de Direct.
- Roteirização multi-parada ou consolidação de carga via Uber Direct — cada pedido gera uma entrega independente.
- Renegociação de preço com a Uber Direct (leilão reverso) — a cotação é aceita ou recusada como veio.

## 3. Funcionalidades

### US01: Cotação automática de frete Uber Direct no checkout

> **Status de implementação (2026-08-21): implementada.** Cotação real no checkout via `POST /api/checkout/cotar-frete` (migrations 0139/0140, `cotar_frete_interno` + `checkout_criar_pedido` com `p_cotacao_externa_id`) — reaproveitando o mecanismo de `transportadoras` (0099/0101, PR #207) em vez da cascata backend originalmente desenhada no Fluxo de Negócio (§4). Ver PR #365 e `openspec/changes/uber-direct-checkout-milestone1/`. Falta apenas aplicar as migrations em produção e validar ponta a ponta com uma cotação real de sandbox (ver §9/§10 e tasks.md do change).

Como comprador, quero ver uma opção de frete via entregador parceiro quando não há afiliado logístico nem parceiro logístico disponível na minha região, para não perder a compra por falta de frete.

**Rules:**
- O sistema só consulta a Uber Direct depois de checar afiliado logístico e parceiro logístico e constatar que nenhum cobre a rota do pedido.
- A cotação exibida ao comprador reflete o valor e prazo retornados pela Uber Direct no momento do checkout (cotação tem validade curta, ver Edge case).
- Se a Uber Direct também não conseguir cotar a rota (fora de área de cobertura), a opção de frete simplesmente não aparece — sem essa via, sem as outras, o checkout segue os demais fluxos existentes de "sem frete disponível".

**Edge cases:**
- Cotação expira antes do comprador finalizar o checkout → sistema recota automaticamente ao avançar para pagamento; se a nova cotação vier com valor diferente, exibe o novo valor antes de confirmar.
- Endereço do vendedor não tem granularidade suficiente (sem número, CEP inválido) para virar `pickup address` → opção Uber Direct não é oferecida para pedidos desse vendedor; sinalizar internamente como gap de cadastro. *(premissa — confirme ou corrija)*
- Uber Direct fora do ar (erro 5xx/timeout na cotação) → falha silenciosa para o comprador, opção simplesmente não aparece; log técnico registra a falha para monitoramento. *(premissa — confirme ou corrija)*

### US02: Despacho da entrega após pagamento confirmado

> **Status de implementação (2026-08-21): feito, divergência de regra resolvida.** Implementado em `src/app/api/asaas/webhook/route.ts` (`despacharUberDirectSeElegivel`), disparado no mesmo webhook que já despacha `corridas`. A divergência registrada em 2026-08-03 (sinal heurístico "nenhuma corrida criada", que quase nunca disparava porque `despachar_corrida_automatica` sempre publica no pool geral — ver §7) foi corrigida: o sinal agora é explícito (`linha_itens.transportadora_id` aponta para a transportadora Uber Direct, decidida no checkout via US01) — quando presente, a corrida automática nem é criada. PR #365.

Como comprador que escolheu frete Uber Direct, quero que a coleta seja acionada automaticamente após meu pagamento ser confirmado, para não precisar de nenhuma ação manual extra.

**Rules:**
- O despacho (criação da delivery na Uber Direct) só ocorre após confirmação de pagamento do pedido — nunca antes.
- O pedido recebe um identificador de rastreamento da Uber Direct associado a ele.
- Falha ao criar a delivery após pagamento confirmado aciona alerta para o time operacional resolver manualmente (o comprador já pagou, não pode ficar sem solução). *(premissa — confirme ou corrija)*

**Edge cases:**
- Pagamento confirmado mas cotação original expirou (ex.: pagamento demorado) → sistema recota antes de criar a delivery; se o novo valor for maior, custo da diferença fica com a plataforma (comprador já pagou o valor cotado). *(premissa — confirme ou corrija)* — decorre da decisão 2 (repasse integral ao comprador do valor que ele já viu e aceitou).
- Uber Direct indisponível no momento do despacho pós-pagamento → pedido entra em fila de retry automático com alerta operacional se não resolver em X tentativas. *(premissa — confirme ou corrija, incluindo o valor de X)*

### US03: Acompanhamento de status da entrega

> **Status de implementação (2026-08-21): corrigido.** Webhook receiver criado em `src/app/api/webhooks/uber-direct/route.ts` (rewrite de `/webhooks/uber-direct` para `/api/webhooks/uber-direct`), atualiza `rotas.status`/`uber_status`/`uber_tracking_url`. Dois bugs reais confirmados e corrigidos direto no painel Uber Direct (aba `andreiaschneider@gmail.com`, organização "Ind." = Industria24horas):
> 1. **Nenhum destino de webhook existia em produção** (nem em teste, apesar do registro anterior dizer o contrário) — endpoint de produção criado agora (`https://industria24.com.br/webhooks/uber-direct`).
> 2. **A URL do endpoint de teste/sandbox estava gravada errada desde 03/08**: só `https://industria24.com.br/` (sem o caminho `/webhooks/uber-direct`) — corrigida.
> `UBER_DIRECT_WEBHOOK_SIGNING_KEY` regravada no Vercel (Production + Preview) com a Signing Key real de cada endpoint (painel: Webhooks → entrada → Editar → "Chave de autenticação"), substituindo o valor antigo (cópia do `client_secret`). Deploy de produção confirmado via `vercel inspect` (`target: production`, `readyState: READY`). Falta ainda o job de reconciliação do Edge case abaixo, e confirmar recebimento de um evento real (nenhum chegou até agora — ver §7).

Como comprador e vendedor, quero ver o status da entrega Uber Direct refletido no meu pedido, para saber quando o produto foi coletado e será entregue.

**Rules:**
- O pedido exibe o status mais recente reportado pela Uber Direct (ex.: coletado, a caminho, entregue) mapeado para os status já usados no painel de pedidos.
- Atualização de status chega via webhook da Uber Direct, não por polling. *(premissa — confirme ou corrija)*

**Edge cases:**
- Webhook não chega ou falha → status do pedido fica desatualizado até reconciliação; definir job de reconciliação periódica como rede de segurança. *(premissa — confirme ou corrija)*
- Entrega cancelada pela Uber Direct (ex.: nenhum entregador aceitou) → pedido volta ao estado "sem frete confirmado" e opções de frete são recalculadas; comprador é notificado. *(premissa — confirme ou corrija)*

### US04: Seller acompanha a entrega do próprio pedido

> **Status de implementação (2026-08-21): feito.** Achado em 2026-08-03 (§7, "Confirmado por leitura de código") de que o seller não tinha painel nenhum para ver `corridas` nem entregas Uber Direct — resolvido com `/seller/entregas` (migration 0141, policy `corridas_seller_read`) e item de navegação em `Sidebar.tsx`. PR #365.

Como vendedor, quero ver o status da corrida ou da entrega Uber Direct dos meus pedidos pagos, para saber se e quando o produto foi coletado, sem depender do comprador me avisar.

**Rules:**
- O seller vê apenas corridas/entregas de pedidos da própria loja.
- A tela mostra origem/destino/status/frete da corrida automática, e status/link de rastreio da entrega Uber Direct, quando aplicável.

**Edge cases:**
- Pedido sem nenhum despacho ainda (ex.: pagamento acabou de confirmar) → seção correspondente aparece vazia com mensagem explicativa, não erro. *(premissa — confirme ou corrija)*

### US05: Reembolso de entrega Uber Direct

> **Status de implementação (2026-08-21): não implementada — modelo real da API é diferente do assumido.** Pesquisa contra a doc oficial (developer.uber.com/docs/deliveries/direct/api/webhook-dapi-refundrequested) mostrou que o Direct API **não expõe um endpoint de submissão de reembolso pelo lojista** (nenhum "submit_refund" confirmado; a rota `/docs/deliveries/api-reference/refund` dá 404). O que existe é um **webhook de notificação** (`dapi.refund_requested`, evento `event.refund_request` — já disponível para marcar na tela "Criar webhook" do painel) que avisa o lojista quando um reembolso **já foi solicitado** (pela Uber/comprador), sem valor/motivo no payload — o lojista consulta o `resource_href` (Get Delivery Status) para detalhes. Ou seja: o fluxo real parece ser "a Uber avisa", não "o lojista pede". Esta US precisa ser reescrita para refletir esse modelo antes de qualquer implementação; a Refund API (se existir uma via de submissão real) continua exigindo acordo comercial não confirmado.

Como admin/seller, quero saber quando um reembolso foi solicitado numa entrega Uber Direct, para acompanhar o caso do comprador. *(user story revisada — a original assumia que o lojista solicitaria o reembolso; ver nota de status)*

**Rules:**
- O evento `event.refund_request` deve ser marcado ao criar/editar o webhook no painel Uber Direct (feito em 2026-08-21 para os dois endpoints, produção e sandbox) para o lojista sequer receber a notificação.
- O payload do webhook não traz motivo/valor — é preciso chamar `resource_href` (Get Delivery Status) para os detalhes. *(não implementado — falta handler dedicado no receiver, hoje só trata `event.delivery_status`)*

**Edge cases:**
- Endpoint de submissão de reembolso pelo lojista não confirmado existir → nenhuma ação de "solicitar reembolso" deve ser construída na UI até esse contrato ser confirmado com a Uber (comercial ou suporte técnico). *(premissa — confirme ou corrija)*

## 4. Fluxo de Negócio

```
Checkout iniciado
   │
   ▼
Afiliado logístico cobre a rota?
   ├── sim ──▶ Usa afiliado logístico (fluxo existente)
   └── não
        │
        ▼
   Parceiro logístico disponível na rota?
        ├── sim ──▶ Usa parceiro logístico (fluxo existente, PRD mobilidade-urbana-on-demand)
        └── não
             │
             ▼
        Cota entrega via Uber Direct
             ├── cobre a rota ──▶ Oferece como opção de frete
             │                         │
             │                         ▼
             │                  Comprador aceita e paga?
             │                    ├── sim ──▶ Despacha delivery Uber Direct
             │                    └── não ──▶ Checkout sem essa opção de frete
             └── não cobre ──▶ Nenhuma opção de frete disponível (fluxo existente de falta de frete)
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| Uber Direct só é cotada quando afiliado logístico e parceiro logístico não cobrem a rota | Preserva a arquitetura de fallback em camadas e evita custo/complexidade desnecessária nos casos já resolvidos internamente | Simular pedido com afiliado disponível e confirmar que Uber Direct não é chamada (log/rede) |
| Delivery só é criada na Uber Direct após confirmação de pagamento | Evita gerar custo de coleta para pedido não pago | Simular checkout sem confirmar pagamento e verificar que nenhuma delivery é criada |
| Status do pedido reflete o status da Uber Direct em até [X minutos] após o webhook | Comprador e vendedor precisam de visibilidade da entrega em andamento | A definir *(premissa — confirme o limiar ou marque como A levantar)* |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| % de pedidos sem frete disponível, recuperados via Uber Direct | A levantar — sem medição hoje de quantos checkouts abandonam por falta de frete | A definir após piloto | A definir | A definir | A definir |
| Custo médio de frete Uber Direct por pedido vs. frete médio das outras vias | A levantar | — | — | — | — |

## 6. Milestones

### Milestone 1: Cotar e oferecer frete Uber Direct no checkout

**Por que é um marco:** primeira vez que o comprador vê uma opção real de frete quando hoje o checkout travaria por falta de cobertura — resolve a perda de venda mesmo sem o despacho automático ainda funcionar ponta a ponta.

**Funcionalidades:** US01

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [x] Uber Direct só é cotada quando nenhuma transportadora interna cobre o CEP (reinterpretação de "afiliado/parceiro não cobrem a rota" em cima do mecanismo real de `transportadoras`, ver §2 e Registro de Decisões 2026-08-21)
- [x] Cotação expirada é rejeitada com mensagem clara para recotar (renovação automática client-side não implementada — ver pendência abaixo)

**Aprovador:** Dono do produto (Andreia)

**Status (2026-08-21): implementado, pendente de aplicar em produção.** Migrations 0139/0140 e PR #365 — plano de implementação de §2 ("Reconciliação com `transportadoras`") seguido à risca, não a cascata backend originalmente descrita no Fluxo de Negócio (§4). Falta: aplicar as migrations em produção (testadas em `begin;...rollback;` antes) e validar com uma cotação real de sandbox ponta a ponta (ver `openspec/changes/uber-direct-checkout-milestone1/tasks.md` §1.4-1.5 e §6). Pendência menor: renovação automática de cotação expirada (o client hoje recota ao mudar o CEP/endereço, mas não tem um retry automático só por tempo decorrido no passo de pagamento) — registrada como *(premissa — confirme ou corrija)* na Rule original, não bloqueia o milestone.

### Milestone 2: Despachar e rastrear a entrega

**Por que é um marco:** fecha o ciclo — pedido pago com frete Uber Direct é efetivamente coletado, entregue, e ambas as partes acompanham o status, sem intervenção manual no caminho feliz.

**Funcionalidades:** US02, US03

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [x] Delivery só é criada na Uber Direct após confirmação de pagamento
- [x] Sinal de despacho é explícito (`linha_itens.transportadora_id`), não mais heurístico — corrige o achado de §7 que bloqueava o milestone na prática
- [ ] Status do pedido reflete o status da Uber Direct via webhook — receiver existe, falta corrigir `UBER_DIRECT_WEBHOOK_SIGNING_KEY` (ver Milestone 3, US05) e confirmar em produção com uma entrega real de sandbox

**Aprovador:** Dono do produto (Andreia)

**Status (2026-08-21): despacho corrigido e em produção (PR #365); rastreamento via webhook segue parcial** — falta a correção operacional da signing key (ação humana, Milestone 3) antes de confiar na validação de assinatura.

### Milestone 3: Fechamento operacional (visibilidade do seller e reembolso)

**Por que é um marco:** fecha as duas lacunas que impediam considerar o fluxo Uber Direct operacionalmente completo — o seller não tinha onde ver a própria entrega (achado de §7), e não há caminho de reembolso quando a entrega dá errado. Sem isso, o time operacional fica sem visibilidade e sem ferramenta de correção mesmo com o despacho funcionando.

**Funcionalidades:** US04, US05

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [x] Seller vê corridas e entregas Uber Direct dos próprios pedidos em `/seller/entregas`
- [x] `UBER_DIRECT_WEBHOOK_SIGNING_KEY` corrigida no Vercel (Production + Preview) com a Signing Key real de cada endpoint do painel Uber Direct — feito ao vivo em 2026-08-21 (usuária logada no painel, agente navegou via browser-harness)
- [x] Bug adicional corrigido: URL do webhook de sandbox estava gravada sem o caminho (`/webhooks/uber-direct`) desde 03/08 — nenhum evento real jamais teria chegado
- [ ] Refund API habilitada comercialmente com a Uber e reembolso implementado contra o contrato real confirmado — modelo real descoberto em 2026-08-21 é diferente do assumido (ver US05)

**Aprovador:** Dono do produto (Andreia)

**Status (2026-08-21): quase completo.** US04 (visibilidade do seller) e a correção da signing key/URL implementadas e em produção. Falta confirmar recebimento de um evento real (webhook nunca recebeu nenhum, mesmo agora com URL/chave corretas — só o tempo/uma entrega real vai confirmar) e US05 (reembolso), bloqueada por acordo comercial e por o modelo real da API ser diferente do assumido originalmente.

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| Cadastro de endereço dos sellers não tem granularidade suficiente para pickup Uber Direct | Alto | Auditar cadastro de endereços antes da implementação; exigir campo estruturado se necessário | Pendente |
| Decisão de precificação (repasse integral vs. markup) não fechada | Médio | Validar com o dono antes do Milestone 1 — impacta cálculo exibido no checkout | Pendente |
| Diferença de valor entre cotação aceita pelo comprador e nova cotação no momento do despacho pós-pagamento | Médio | Decisão de produto já inferida (US02) — plataforma absorve a diferença; validar com o dono | Pendente |
| Credenciais de sandbox e produção coexistem no mesmo painel Uber Direct (Chaves de API tem toggle "credenciais de teste/produção") | Alto | Todo código e teste deve confirmar `customer_id`/`client_id` de sandbox antes de qualquer chamada; nunca copiar credencial de produção para ambiente de dev por engano | Monitorando |
| Nome exato do header/algoritmo de assinatura do webhook Uber Direct não confirmado contra a doc oficial (pesquisa via WebFetch não trouxe a API reference completa, é SPA) | Alto | `UBER_DIRECT_WEBHOOK_SIGNING_KEY` ausente = validação desligada (aceita qualquer request); confirmar contra a doc ou testar com um evento real de sandbox antes de aceitar entregas reais | Pendente |
| "Sem corrida criada" (US02 implementada) não é o mesmo sinal que "afiliado/parceiro não cobre a rota" (US01 como especificada) — pode haver falso positivo se o despacho automático falhar por outro motivo que não falta de cobertura | Médio | Monitorar Sentry (`signal: roteirizacao_pos_pagamento`) nas primeiras semanas para diferenciar "sem cobertura real" de "erro no despacho interno" | Monitorando |
| **Confirmado por teste (2026-08-03), RESOLVIDO em 2026-08-21:** `despachar_corrida_automatica` publica uma `corrida` no pool geral de parceiros para QUALQUER pedido com entrega, haja ou não afiliado/parceiro real disponível para aceitar — não existia sinal de "sem cobertura" no schema. | Alto | Resolvido pela reconciliação com `transportadoras` (§2): a escolha do comprador no checkout (US01) grava `linha_itens.transportadora_id` explicitamente, e o webhook de pagamento usa esse sinal direto em vez de inferir do resultado do despacho automático interno. Ver US02, PR #365 | Resolvido — US02 corrigida |
| **Confirmado por leitura de código (2026-08-03), RESOLVIDO em 2026-08-21:** o seller não tinha painel nenhum para acompanhar `corridas` (despacho automático) nem entregas Uber Direct — `/seller/rotas` só lia a tabela legada `rotas`, não `corridas` nem `uber_status`/`uber_tracking_url` | Alto | Resolvido por `/seller/entregas` (migration 0141, policy `corridas_seller_read`) — ver US04, PR #365 | Resolvido |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| PRD 001 (confirmação de entrega por código do comprador) | Interna | Concluído *(confirmar status atual)* | Milestone 2 pode precisar do mesmo mecanismo de confirmação para a entrega via Uber Direct |
| Módulo Parceiro Logístico (PRD `mobilidade-urbana-on-demand.md`) | Interna | Em schema (migration 0039 aplicada) | Sem a checagem de disponibilidade de parceiro logístico, não há como determinar quando acionar o fallback Uber Direct |
| Conta e credenciais Uber Direct | Externa | Concluído — conta "Industria24horas" já existe em direct.uber.com; credenciais sandbox (`customer_id`, `client_id`, `client_secret`) capturadas e salvas em `.env.local` + Vercel (`UBER_DIRECT_CUSTOMER_ID`, `UBER_DIRECT_CLIENT_ID`, `UBER_DIRECT_CLIENT_SECRET`, Production e Preview) | Resolvido |
| Webhook Uber Direct → Industria24h | Externa | Resolvido — endpoint `src/app/api/webhooks/uber-direct/route.ts` em produção, com rewrite de `/webhooks/uber-direct` (URL configurada no painel) para `/api/webhooks/uber-direct` (convenção do projeto) | — |
| Migration de tracking Uber Direct | Interna | Resolvido — `supabase/migrations/0099_uber_direct_tracking.sql` (renumerada de 0098 por colisão com `0098_seller_carrinhos_abandonados.sql`, PR concorrente mergeado antes do push deste PRD) | — |
| Migrations Milestone 1/US04 (transportadora Uber Direct, cotação salva, RPC, RLS seller) | Interna | Código pronto (PR #365) — `0139_uber_direct_transportadora.sql`, `0140_checkout_cotacao_uber_direct.sql`, `0141_corridas_seller_read.sql`; falta aplicar em produção | Sem aplicar, US01/US04 ficam só em código, não em produção |
| Refund API habilitada comercialmente com a Uber (US05) | Externa | Pendente — requer contato com representante de vendas Uber Direct | Bloqueia toda a US05 |
| Correção de `UBER_DIRECT_WEBHOOK_SIGNING_KEY` no painel Uber Direct (US05/Milestone 3) | Externa | Pendente — ação humana, painel Uber Direct | Validação de assinatura do webhook de status continua não confiável |

## 8. Referências

- [PRD Mobilidade urbana on-demand](../prd/mobilidade-urbana-on-demand.md) — mecanismo de fallback interno que este PRD complementa, não substitui
- [Migration 0039 — Parceiro Logístico](../../supabase/migrations/0039_parceiro_logistico_schema.sql) — schema de referência para checagem de disponibilidade
- [Uber Direct — documentação oficial](https://developer.uber.com/docs/deliveries) — onboarding, autenticação OAuth client_credentials, Direct API (DaaS)
- [Uber Direct — verificação de assinatura de webhook](https://developer.uber.com/docs/deliveries/guides/webhooks) — confirma header/algoritmo corretos; achado sobre a signing key (2026-08-21)
- [PR #365](https://github.com/Schneider-Gr/industria24hIA/pull/365) — implementação do Milestone 1 (US01/US02/US04)
- [Issue #364](https://github.com/Schneider-Gr/industria24hIA/issues/364) — pendências operacionais (US05, signing key)
- `openspec/changes/uber-direct-checkout-milestone1/` — proposal/specs/design/tasks do Milestone 1

## 9. Registro de Decisões

- **2026-08-03:** Uber Direct entra como terceira via de frete, estritamente em fallback depois de afiliado logístico e parceiro logístico. Motivo: evitar canibalizar os mecanismos internos já construídos (PRD mobilidade-urbana-on-demand) e limitar o custo de uma via terceirizada aos casos que hoje perdem a venda.
- **2026-08-03:** Cotação Uber Direct entra no fluxo de checkout, não como ação manual do seller/admin. Motivo: decisão explícita do usuário na fase de brainstorm — resolve o caso de falta de cobertura no momento em que ele acontece, sem depender de intervenção operacional.
- **2026-08-03:** Conta Uber Direct "Industria24horas" já existia (criada antes deste PRD); credenciais de sandbox capturadas e provisionadas em `.env.local` e Vercel (Production + Preview). Motivo: elimina o risco antes bloqueante de onboarding — passa a ser pré-condição resolvida, não pendência de implementação.
- **2026-08-03:** Implementação real do Milestone 1 divergiu do PRD — em vez de US01 (cotar e oferecer no checkout, antes do pagamento), foi construído o fluxo de US02/US03 (despacho automático pós-pagamento, sem oferta prévia ao comprador), reaproveitando o ponto de integração que já existe no webhook do Asaas (`despacharCorridaParaPedido`). Motivo: instrução do usuário foi concluir a integração sem mais perguntas; o ponto de despacho pós-pagamento já existia e tinha convenção clara para seguir (client `lib/asaas.ts`, webhook `api/asaas/webhook`), enquanto o client do checkout (`src/app/checkout/`) exigiria mapear e alterar lógica de UI/estado ainda não investigada a fundo. **Consequência de produto**: hoje o comprador não vê nem escolhe a opção Uber Direct antes de pagar — ela só entra em ação depois, como rede de segurança, e só quando nenhuma `rota` interna foi criada. Se o objetivo original (comprador ver a opção no checkout, US01) continuar sendo o requisito, falta implementar — é trabalho novo, não um ajuste do que já está em produção.
- **2026-08-03:** Migration renumerada de 0098 para 0099 e depois para 0103 (`0103_uber_direct_tracking.sql`) por DUAS colisões sucessivas com PRs concorrentes mergeados em master antes do push. Motivo: regra do projeto — número duplicado trava o job `migrations-lint` do CI para qualquer PR.
- **2026-08-03:** Deploy de produção confirmado via `vercel inspect` — commits `1d2c8b9` (webhook sandbox + hipótese HMAC) e `42663cb` (merge PR #219) no ar, `target: production`, `readyState: READY`.
- **2026-08-03:** Descoberta pós-implementação de PR concorrente (`0099_transportadoras.sql`, `0101_checkout_transportadora.sql`, PR #207) que criou o mecanismo correto de transportadora selecionável no checkout, incluindo `fonte='mercado_envios'` reservado para cotação externa. Decisão: não retrabalhar agora — registrar o plano de reconciliação em §2 para migrar Milestone 1 (ainda não iniciado) para cima desse mecanismo em vez da cascata backend originalmente desenhada no Fluxo de Negócio (§4), que fica desatualizada em relação a essa decisão.
- **2026-08-03:** Teste de integração ponta a ponta (pedido sintético inserido direto no banco na Loja Teste Tour QA, pagamento simulado via chamada direta ao webhook do Asaas com token rotacionado) revelou e corrigiu um bug real: `despacharUberDirectSeElegivel` checava a tabela `rotas` (legada, não escrita pelo despacho automático desde a 0043) em vez de `corridas`. Corrigido no commit `5ae1472` — agora usa o retorno de `despacharCorridaParaPedido`. O mesmo teste revelou um problema mais profundo, não corrigido nesta rodada: `despachar_corrida_automatica` sempre publica uma corrida no pool geral, então o gatilho "sem corrida" do fallback quase nunca dispara em operação real — ver linha "Confirmado por teste" em §7. `ASAAS_WEBHOOK_TOKEN` foi rotacionado no Vercel (Production+Preview) e redeployado durante esse teste, pois o valor anterior era tipo Sensitive (irrecuperável); o painel do Asaas ainda precisa ser atualizado com o novo valor para webhooks reais de pagamento continuarem funcionando — pendência operacional, não deste PRD.
- **2026-08-03:** Levantamento de código mostrou que o seller não tem painel para acompanhar `corridas` nem entregas Uber Direct — registrado como pendência em §7 (linha "Confirmado por leitura de código").
- **2026-08-21:** Milestone 1 (US01) implementado seguindo o plano de reconciliação com `transportadoras` já registrado em §2 — não a cascata backend do Fluxo de Negócio (§4). Critério usado: Uber Direct só é cotada quando `cotar_frete_interno` não encontra faixa interna para o CEP (reinterpretação operacional de "fallback" em cima do mecanismo real, já que o schema de `transportadoras` não distingue "afiliado/parceiro cobrem" de "transportadora interna cobre"). Decisão de produto herdada (1) do §2 permanece: sempre fallback, nunca opção sempre visível — item ainda em aberto conforme Open Question registrada.
- **2026-08-21:** Sinal de despacho pós-pagamento (US02) corrigido de heurístico para explícito. Motivo: o teste de 2026-08-03 já tinha provado que o sinal antigo não funcionava em operação real (§7); a correção só ficou possível depois que US01 passou a gravar `transportadora_id` explicitamente no checkout — as duas mudanças são uma unidade, não itens independentes.
- **2026-08-21:** Painel `/seller/entregas` (US04) criado liberando `corridas_seller_read` (migration 0141) em vez de estender `/seller/rotas` (que lê a tabela legada `rotas`) — decisão: nova tela em vez de reaproveitar a existente, porque `/seller/rotas` é sobre o fluxo manual pré-0043 (atribuição), não sobre acompanhamento de status; misturar os dois conceitos numa tela só confundiria mais do que ajudaria.
- **2026-08-21:** Pesquisa contra a doc oficial (developer.uber.com/docs/deliveries/guides/webhooks) confirmou que o header/algoritmo de assinatura do webhook (`x-uber-signature`, HMAC-SHA256) estavam certos desde 2026-08-03 — o erro real é a CHAVE usada (`client_secret` copiado, quando deveria ser a Webhook Signing Key dedicada do painel). Não corrigido nesta sessão por exigir acesso ao painel Uber Direct (ação humana) — registrado como US05/Milestone 3.
- **2026-08-21:** Reembolso Uber Direct (US05) registrado como requisito de produto mas não implementado — a Refund API exige acordo comercial e seu contrato real não pôde ser confirmado contra a doc oficial nesta sessão (SPA sem conteúdo acessível via fetch). Decisão: não codar contrato especulativo de API externa (regra do projeto contra inventar schema/contrato).
- **2026-08-21:** Pesquisa adicional (WebSearch/WebFetch) descobriu o webhook real `dapi.refund_requested`/`event.refund_request` — modelo de notificação (Uber avisa o lojista), não de submissão pelo lojista. US05 reescrita para refletir isso; nenhum endpoint de submissão de reembolso foi encontrado nos docs públicos, então nenhuma UI de "solicitar reembolso" foi construída.
- **2026-08-21:** Verificação ao vivo no painel Uber Direct (usuária logada, agente navegando via browser-harness, organização "Ind." = Industria24horas) encontrou dois bugs reais, não apenas a hipótese registrada em 03/08:
  1. Não existia NENHUM webhook cadastrado em produção (contradiz o registro de 03/08 de que "endpoint já configurado no painel"). Criado agora: `https://industria24.com.br/webhooks/uber-direct`, eventos status da entrega + atualização do entregador + solicitação de reembolso.
  2. O webhook de sandbox existia mas com a URL gravada errada desde 03/08 — só `https://industria24.com.br/`, sem `/webhooks/uber-direct` — nenhum evento real jamais teria chegado no endpoint certo. Corrigido.
  `UBER_DIRECT_WEBHOOK_SIGNING_KEY` regravada no Vercel (Production + Preview) com a Signing Key real de cada endpoint (painel → Webhooks → Editar → "Chave de autenticação"), substituindo o valor antigo (cópia do `client_secret`). Deploy de produção confirmado via `vercel inspect`. Nota de processo: durante a navegação, um clique em "Cancelar" não encontrou o botão (seletor de texto exato falhou por causa de ícone concatenado ao texto) e o formulário de criação do webhook de produção acabou salvo sem confirmação explícita, com os 3 tipos de evento em vez de só 1 — reportado à usuária antes de prosseguir, que optou por manter (URL e chave corretos, eventos extras são inofensivos já que o receiver ignora o que não reconhece).
- **2026-08-21:** Busca em `vercel logs` (produção, 24h e 30d) não encontrou nenhuma requisição para `/webhooks/uber-direct`/`/api/webhooks/uber-direct` — consistente com os dois bugs acima (sem destino configurado ou com URL errada, a Uber nunca teve como entregar um evento). Ainda não há confirmação de que um evento real chega com a configuração corrigida — pendência de validação futura.

## 10. Processo de Implementação e Teste (histórico técnico)

Log cronológico de execução — complementa o Registro de Decisões (§9, que cobre o *porquê* de produto) com o *como* técnico, para quem precisar retomar ou auditar o trabalho.

### 10.1 Provisionamento de credenciais

1. Conta Uber Direct "Industria24horas" já existia em `direct.uber.com`, criada antes deste PRD.
2. Credenciais de **sandbox** (`customer_id`, `client_id`, `client_secret`) capturadas via inspeção do DOM do painel Uber Direct (aba logada `industria24hs@gmail.com`), com cuidado explícito para não capturar as credenciais de **produção** que o painel mostra por padrão em algumas telas (usa-se o toggle "Mudar para teste").
3. Gravadas em `.env.local` (não versionado) e em Vercel (`vercel env add`, Production + Preview) para `UBER_DIRECT_CUSTOMER_ID`, `UBER_DIRECT_CLIENT_ID`, `UBER_DIRECT_CLIENT_SECRET`.
4. `UBER_DIRECT_WEBHOOK_SIGNING_KEY` definida com o mesmo valor de `UBER_DIRECT_CLIENT_SECRET` — hipótese não confirmada contra a doc oficial (painel Uber Direct não expõe um "signing secret" próprio), documentada em comentário no código do webhook.

### 10.2 Webhook Uber Direct → Industria24h

1. Endpoint criado em `src/app/api/webhooks/uber-direct/route.ts`, validando assinatura HMAC-SHA256 (header `x-uber-signature`, chave = `UBER_DIRECT_WEBHOOK_SIGNING_KEY`) — desligada (aceita tudo) se a chave estiver ausente.
2. Rewrite em `next.config.ts` mapeando `/webhooks/uber-direct` → `/api/webhooks/uber-direct`, porque o painel Uber Direct foi configurado com a URL sem o prefixo `/api` (convenção do projeto para webhooks).
3. Endpoint de **sandbox** criado manualmente no painel Uber Direct (só existia para produção antes) — sem isso, nenhum evento de teste chegaria à aplicação.

### 10.3 Migration de tracking (saga de renumeração)

1. Migration criada como `0098_uber_direct_tracking.sql` (colunas `uber_delivery_id`, `uber_tracking_url`, `uber_status` em `rotas`).
2. Aplicada diretamente em produção via `supabase db query --linked --file`, testada antes em `begin;...rollback;`.
3. Duas colisões sucessivas de numeração com PRs concorrentes mergeados em `master` antes do push (`0098_seller_carrinhos_abandonados.sql`, depois `0099_transportadoras.sql`): arquivo renomeado `0098` → `0099` → `0103`, com `if not exists` em todas as colunas para manter a migration idempotente (já tinha sido aplicada sob o número anterior).
4. Cada renumeração seguiu o mesmo checklist: `git fetch` + `git merge origin/master` + `ls supabase/migrations | grep -oE '^[0-9]{4}' | sort | uniq -d` (detecta duplicata) + renomear + reaplicar via `to_regclass`.

### 10.4 Deploy de produção

1. `git push` bloqueado por `fetch first` três vezes ao longo da sessão (PRs concorrentes); resolvido sempre com `git fetch origin master` + `git merge origin/master` (nunca rebase) + `tsc --noEmit` + repetir checagem de colisão de migration.
2. `vercel --prod` executado após cada merge relevante; confirmado com `vercel inspect <url>` (`target: production`, `readyState: READY`) antes de reportar como "no ar" — nunca só pelo retorno do `vercel --prod`.
3. Commits de deploy relevantes: `1d2c8b9` (webhook sandbox + hipótese HMAC), `42663cb` (merge PR #219), `5ae1472` (fix do bug de tabela `rotas`→`corridas`, ver 10.6).

### 10.5 Rotação de `ASAAS_WEBHOOK_TOKEN`

1. Necessária para simular o webhook de pagamento com um valor de token conhecido — o valor anterior era tipo **Sensitive** no Vercel (diferente de Encrypted), que é write-only por design: nem `vercel env pull`, nem o dashboard, nem nenhuma API revelam esse tipo de variável depois de gravada, para ninguém, nem para o dono da conta. Confirmado por três tentativas de leitura distintas (CLI, dashboard via browser, re-pull limpo) antes de descartar a via de leitura.
2. Novo token gerado (`crypto.randomBytes(24).toString('hex')`), gravado via `vercel env rm` + `vercel env add ... --sensitive` em Production e Preview, seguido de `vercel --prod` para o novo valor entrar em vigor no código já publicado.
3. **Pendência operacional em aberto:** o painel do Asaas precisa ser atualizado com o mesmo valor novo para os webhooks reais de pagamento (produção) continuarem sendo aceitos — item fora do escopo deste PRD, mas registrado aqui para não se perder.

### 10.6 Teste de integração ponta a ponta (metodologia)

Sem sandbox de pagamento disponível no Asaas em produção, o teste foi feito sem gerar cobrança real:

1. Endereço de coleta da Loja Teste Tour QA (`31d774da-e932-4a08-a404-dd05a51a78a5`) preenchido via SQL direto (`cep`, `rua`, `numero`, `bairro`, `cidade`, `estado`) — estava vazio, o que teria bloqueado qualquer despacho Uber Direct por endereço de pickup incompleto.
2. Pedido sintético inserido diretamente via `insert into pedidos` (não pela RPC `checkout_criar_pedido`) com `asaas_cobranca_id` fixo (`pay_teste_uberdirect_0803`) e `status_pedido = 'Aguardando Pagamento'`.
3. Linha de item inserida em `linha_itens` com endereço de entrega completo e `retirar_na_loja = false`, produto real da loja ("Croissant Amanteigado", R$5,90).
4. Pagamento confirmado simulado com `curl` direto contra `POST https://industria24.com.br/api/asaas/webhook`, header `asaas-access-token` com o novo token, payload `event: PAYMENT_CONFIRMED` batendo `externalReference` (pedido) e `payment.id` (`asaas_cobranca_id`) — replica exatamente a validação que o handler faz (`cobrancaConfere`, `valorConfere`) sem depender do Asaas real.
5. Resultado inspecionado via `supabase db query --linked`: `pedidos.status_pedido = 'Pagamento Realizado'`, uma `corrida` "Publicada" foi criada, nenhuma `rota` Uber Direct foi criada — comportamento correto pós-fix (ver §7 e §9 para a leitura desse resultado).
6. Pedido e linha de teste permanecem no banco de produção, na loja de teste (não afeta lojas reais); não foram removidos após o teste.
