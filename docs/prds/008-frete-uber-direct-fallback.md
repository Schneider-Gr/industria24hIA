---
prd_number: "008"
status: rascunho
priority: média
created: 2026-08-03
issue: ""
depends_on: ["001"]
references:
  - "docs/prd/mobilidade-urbana-on-demand.md" – PRD do módulo Parceiro Logístico (fallback interno que este PRD complementa)
  - "supabase/migrations/0039_parceiro_logistico_schema.sql" – schema do módulo Parceiro Logístico
  - "https://developer.uber.com/docs/deliveries" – documentação oficial Uber Direct
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

### Fora do escopo

- Despacho manual pelo seller/admin fora do fluxo de checkout (ex.: botão avulso no painel do vendedor). *(premissa — confirme ou corrija)* — pode virar PRD futuro se o checkout automático não cobrir os casos de uso do dono.
- Transporte de passageiros ou qualquer modal fora de encomendas/carga leve.
- Integração com Uber for Business ou qualquer produto Uber além de Direct.
- Roteirização multi-parada ou consolidação de carga via Uber Direct — cada pedido gera uma entrega independente.
- Renegociação de preço com a Uber Direct (leilão reverso) — a cotação é aceita ou recusada como veio.

## 3. Funcionalidades

### US01: Cotação automática de frete Uber Direct no checkout

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

Como comprador que escolheu frete Uber Direct, quero que a coleta seja acionada automaticamente após meu pagamento ser confirmado, para não precisar de nenhuma ação manual extra.

**Rules:**
- O despacho (criação da delivery na Uber Direct) só ocorre após confirmação de pagamento do pedido — nunca antes.
- O pedido recebe um identificador de rastreamento da Uber Direct associado a ele.
- Falha ao criar a delivery após pagamento confirmado aciona alerta para o time operacional resolver manualmente (o comprador já pagou, não pode ficar sem solução). *(premissa — confirme ou corrija)*

**Edge cases:**
- Pagamento confirmado mas cotação original expirou (ex.: pagamento demorado) → sistema recota antes de criar a delivery; se o novo valor for maior, custo da diferença fica com a plataforma (comprador já pagou o valor cotado). *(premissa — confirme ou corrija)* — decorre da decisão 2 (repasse integral ao comprador do valor que ele já viu e aceitou).
- Uber Direct indisponível no momento do despacho pós-pagamento → pedido entra em fila de retry automático com alerta operacional se não resolver em X tentativas. *(premissa — confirme ou corrija, incluindo o valor de X)*

### US03: Acompanhamento de status da entrega

Como comprador e vendedor, quero ver o status da entrega Uber Direct refletido no meu pedido, para saber quando o produto foi coletado e será entregue.

**Rules:**
- O pedido exibe o status mais recente reportado pela Uber Direct (ex.: coletado, a caminho, entregue) mapeado para os status já usados no painel de pedidos.
- Atualização de status chega via webhook da Uber Direct, não por polling. *(premissa — confirme ou corrija)*

**Edge cases:**
- Webhook não chega ou falha → status do pedido fica desatualizado até reconciliação; definir job de reconciliação periódica como rede de segurança. *(premissa — confirme ou corrija)*
- Entrega cancelada pela Uber Direct (ex.: nenhum entregador aceitou) → pedido volta ao estado "sem frete confirmado" e opções de frete são recalculadas; comprador é notificado. *(premissa — confirme ou corrija)*

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
- [ ] Uber Direct só é cotada quando afiliado logístico e parceiro logístico não cobrem a rota
- [ ] Cotação expirada é renovada automaticamente antes da confirmação

**Aprovador:** Dono do produto (Andreia)

### Milestone 2: Despachar e rastrear a entrega

**Por que é um marco:** fecha o ciclo — pedido pago com frete Uber Direct é efetivamente coletado, entregue, e ambas as partes acompanham o status, sem intervenção manual no caminho feliz.

**Funcionalidades:** US02, US03

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Delivery só é criada na Uber Direct após confirmação de pagamento
- [ ] Status do pedido reflete o status da Uber Direct via webhook

**Aprovador:** Dono do produto (Andreia)

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| Cadastro de endereço dos sellers não tem granularidade suficiente para pickup Uber Direct | Alto | Auditar cadastro de endereços antes da implementação; exigir campo estruturado se necessário | Pendente |
| Decisão de precificação (repasse integral vs. markup) não fechada | Médio | Validar com o dono antes do Milestone 1 — impacta cálculo exibido no checkout | Pendente |
| Diferença de valor entre cotação aceita pelo comprador e nova cotação no momento do despacho pós-pagamento | Médio | Decisão de produto já inferida (US02) — plataforma absorve a diferença; validar com o dono | Pendente |
| Credenciais de sandbox e produção coexistem no mesmo painel Uber Direct (Chaves de API tem toggle "credenciais de teste/produção") | Alto | Todo código e teste deve confirmar `customer_id`/`client_id` de sandbox antes de qualquer chamada; nunca copiar credencial de produção para ambiente de dev por engano | Monitorando |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| PRD 001 (confirmação de entrega por código do comprador) | Interna | Concluído *(confirmar status atual)* | Milestone 2 pode precisar do mesmo mecanismo de confirmação para a entrega via Uber Direct |
| Módulo Parceiro Logístico (PRD `mobilidade-urbana-on-demand.md`) | Interna | Em schema (migration 0039 aplicada) | Sem a checagem de disponibilidade de parceiro logístico, não há como determinar quando acionar o fallback Uber Direct |
| Conta e credenciais Uber Direct | Externa | Concluído — conta "Industria24horas" já existe em direct.uber.com; credenciais sandbox (`customer_id`, `client_id`, `client_secret`) capturadas e salvas em `.env.local` + Vercel (`UBER_DIRECT_CUSTOMER_ID`, `UBER_DIRECT_CLIENT_ID`, `UBER_DIRECT_CLIENT_SECRET`, Production e Preview) | Resolvido |
| Webhook Uber Direct → Industria24h | Externa | Já configurado no painel Uber Direct: `https://industria24.com.br/webhooks/uber-direct`, eventos `delivery_status`, `courier_update`, `refund_request` | O endpoint precisa existir no código antes de qualquer entrega real ser criada — ver TRD para o handler correspondente |

## 8. Referências

- [PRD Mobilidade urbana on-demand](../prd/mobilidade-urbana-on-demand.md) — mecanismo de fallback interno que este PRD complementa, não substitui
- [Migration 0039 — Parceiro Logístico](../../supabase/migrations/0039_parceiro_logistico_schema.sql) — schema de referência para checagem de disponibilidade
- [Uber Direct — documentação oficial](https://developer.uber.com/docs/deliveries) — onboarding, autenticação OAuth client_credentials, Direct API (DaaS)

## 9. Registro de Decisões

- **2026-08-03:** Uber Direct entra como terceira via de frete, estritamente em fallback depois de afiliado logístico e parceiro logístico. Motivo: evitar canibalizar os mecanismos internos já construídos (PRD mobilidade-urbana-on-demand) e limitar o custo de uma via terceirizada aos casos que hoje perdem a venda.
- **2026-08-03:** Cotação Uber Direct entra no fluxo de checkout, não como ação manual do seller/admin. Motivo: decisão explícita do usuário na fase de brainstorm — resolve o caso de falta de cobertura no momento em que ele acontece, sem depender de intervenção operacional.
- **2026-08-03:** Conta Uber Direct "Industria24horas" já existia (criada antes deste PRD); credenciais de sandbox capturadas e provisionadas em `.env.local` e Vercel (Production + Preview). Motivo: elimina o risco antes bloqueante de onboarding — passa a ser pré-condição resolvida, não pendência de implementação.
