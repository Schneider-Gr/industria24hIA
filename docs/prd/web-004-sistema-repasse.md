---
prd_number: "004"
title: Sistema de Repasse Automático via Asaas
status: rascunho
created_at: 2026-07-28
version: 1.0
depends_on: []
references:
  - "https://docs.asaas.com/reference/webhook-de-pagamento"
  - "mcp-server/REPASSE_ASAAS.md"
  - "src/app/api/webhooks/asaas/route.ts"
---

# Sistema de Repasse Automático via Asaas

## 1. Visão Geral

O sistema de repasse automatiza o processamento de comissões e transferências de fundos para sellers e afiliados após a confirmação de pagamento de um pedido via PIX. Quando um comprador paga, o sistema calcula as comissões devidas (seller %, afiliado %), deduz a taxa da plataforma e executa transferências automáticas via Asaas para as contas bancárias dos beneficiários.

### Objetivo de Negócio

Garantir fluxo de caixa transparente e automático para sellers e afiliados, reduzindo atrito administrativo e aumentando confiança no marketplace.

---

## 2. Escopo

### Incluso

- Recebimento e validação de webhooks de pagamento do Asaas (PIX confirmado)
- Cálculo automático de comissões (seller %, afiliado %, taxa plataforma)
- Transferência via API Asaas para contas bancárias do seller e afiliado
- Rastreamento de repasses em banco de dados (pedido → repasse → transfer_id_asaas)
- Notificação ao seller/afiliado de execução de repasse
- Tratamento de falhas de transferência (retry automático)
- Auditoria de comissões via logs de repasse

### Fora do Escopo

- Chargebacks ou devoluções de pedidos (regra de negócio futura)
- Cálculo de imposto de renda (IR) ou retenção fiscal — reportado apenas
- Antecipação de recebíveis (faturamento de futuros repasses)
- Saque manual de saldo em conta — seller retira saldo acumulado via painel (feature separada)
- Análise de fraude ou limite de transação por seller — implementar em fase 2
- WhatsApp notifications — usar sistema de e-mail existente

---

## 3. User Stories

### US01 — Recebimento de pagamento PIX

**Como** comprador, **quero** confirmar o pagamento de um pedido via PIX, **para que** o seller saiba que a compra foi realizada.

#### Rules

- PIX recebido e confirmado no Asaas dispara webhook `payment.received`
- Pedido é marcado como `status: PAGO` em Supabase quando webhook chega
- Campo `pago_em` recebe timestamp da confirmação (via `payment.receivedDate` do Asaas)
- Campo `payment_id_asaas` armazena o ID único da cobrança no Asaas
- Campo `payment_valor_liquido` armazena o valor líquido (após taxas Asaas)

#### Edge Cases

- Webhook chega após timeout de cobrança → pedido vencido; marcado como `VENCIDO`, nenhum repasse executado *(premissa — é correto ignorar pagamentos de pedidos vencidos?)*
- Webhook duplicado (Asaas reenvia o mesmo evento 2×) → idempotência via `payment_id_asaas` (upsert, não insert)
- Pedido sem `seller_id` ou `afiliado_id` válido → log de erro, repasse não gerado *(premissa — existe validação de seller na criação do pedido?)*

---

### US02 — Cálculo de comissões

**Como** seller, **quero** receber minha comissão sobre cada venda, **para** ter rentabilidade clara e previsível.

#### Rules

- Comissão do seller = `valor_liquido × comissao_percentual_seller` (configurável por seller ou por padrão)
- Comissão do afiliado = `valor_liquido × comissao_percentual_afiliado` (se houver afiliado associado)
- Taxa da plataforma = `valor_liquido - comissao_seller - comissao_afiliado`
- Todas as comissões em centavos (sem arredondamento até o cálculo final)
- Comissões são calculadas apenas sobre `payment_valor_liquido` (Asaas já descontou suas taxas)

#### Edge Cases

- Comissões não somam 100% (ex: seller 20% + afiliado 5% = 25%, plataforma fica com 75%) → cálculo válido, plataforma lucra mais *(premissa — é modelo desejado ou taxa plataforma é fixa?)*
- Comissão resulta em valor < R$ 0,50 → bloquear repasse, registrar em `repasses.motivo_bloqueio` *(premissa — existe limite mínimo de transferência?)*
- Seller sem dados bancários cadastrados → não gerar repasse, marcar como `BLOQUEADO` *(premissa — existe validação de dados bancários?)*

---

### US03 — Transferência automática via Asaas

**Como** seller, **quero** receber meus fundos na minha conta bancária, **para** ter acesso ao dinheiro ganho.

#### Rules

- Repasse é enviado T+1 (próximo dia útil após confirmação PIX), via job automático *(premissa — é T+1 ou configurável?)*
- Uma transferência via `POST /transfers` do Asaas por beneficiário (seller ou afiliado)
- Transferência inclui: banco (código), agência, conta, CPF/CNPJ, nome titular, valor
- Campo `transfer_id_asaas` armazena o ID retornado pelo Asaas
- Status do repasse muda para `EXECUTADO` quando webhook `transfer.sent` chega
- Comprovante de transferência (`transfer_id_asaas`) fica disponível para seller no painel

#### Edge Cases

- Asaas rejeita transferência (dados bancários inválidos, conta bloqueada) → status fica `ERRO`, retry automático às 14h próximo dia útil *(premissa — qual é a estratégia de retry?)*
- Transferência fica "pendente" por 3+ dias → log com flag para análise humana
- Seller muda dados bancários no meio do processamento → transferência anterior já iniciada, não se altera; próximo repasse usa dados novos *(premissa — há cleanup de repasses pendentes se dados mudarem?)*

---

### US04 — Rastreamento e auditoria de repasses

**Como** admin/suporte, **quero** auditar todos os repasses executados, **para** garantir integridade financeira.

#### Rules

- Tabela `repasses` registra cada repasse: `id`, `pedido_id`, `seller_id`, `afiliado_id`, `valor_seller`, `valor_afiliado`, `valor_taxa_plataforma`, `transfer_id_seller`, `transfer_id_afiliado`, `status`, `created_at`, `executed_at`
- Status pode ser: `PENDENTE`, `EXECUTADO`, `ERRO`, `BLOQUEADO`
- Log de cada tentativa de transferência (incluindo falhas e retries)
- Cada repasse é vinculado ao pedido via `pedido_id` para rastreabilidade completa

#### Edge Cases

- Repasse parcial (seller sim, afiliado não, por erro) → ambos registrados como tentativas separadas
- Admin cancela um pedido após repasse → repasse fica marcado como executado, reversal fica como feature futura
- Auditoria mensal de comissões não bate com banco → investigar via log de repasses

---

### US05 — Carência de saque para afiliado

**Como** seller/afiliado, **quero** ter transparência sobre quando consigo sacar meu dinheiro, **para** não ter surpresas.

#### Rules

- Afiliado: repasse só é executado após 15 dias da confirmação de pagamento *(premissa — 15 dias é correto?)*
- Seller: repasse é executado T+1 (sem carência)
- Dinheiro em carência fica visível no painel do afiliado como "saldo bloqueado até [data]"
- Após 15 dias, próximo job de repasse processa o afiliado automaticamente

#### Edge Cases

- Afiliado pede reembolso manual antes de 15 dias → suporte faz análise, pode autorizar transferência manual de exceção *(premissa — pode haver exceção?)*
- Afiliado recebe múltiplas vendas, algumas dentro, algumas fora da carência → cada uma processada conforme sua data *(premissa — processamento granular ou por lote?)*

---

## 4. Fluxo de Negócio

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Comprador faz pedido (seller_id, afiliado_id preenchidos)    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. Cobrança PIX criada no Asaas (externalReference = pedido_id) │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. Comprador confirma PIX (Asaas envia webhook payment.received) │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. Webhook Handler:                                              │
│    - Valida token ASAAS_WEBHOOK_TOKEN                           │
│    - Busca pedido por externalReference                         │
│    - Marca status = PAGO, pago_em = now                         │
│    - Cria entrada em repasses com status = PENDENTE             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. Job de Repasse (T+1, 08:00 BRT):                             │
│    - Busca repasses PENDENTE onde (agora - pago_em) >= 1 dia    │
│    - Para afiliados: checa carência (>= 15 dias)                │
│    - Calcula: seller%, afiliado%, taxa plataforma              │
│    - Executa transferência Asaas para cada beneficiário         │
│    - Marca repasse como EXECUTADO (ou ERRO se falhar)           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. Webhook transfer.sent (Asaas → webhook handler):             │
│    - Busca repasse via externalReference                        │
│    - Marca status = EXECUTADO, executed_at = now                │
│    - Envia notificação ao seller/afiliado                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. Seller/Afiliado vê repasse no painel e recebe notificação    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Critérios de Aceitação

### 5a. Funcionais

- ✅ Webhook `payment.received` marca pedido como PAGO em < 100ms
- ✅ Repasse é criado com comissões calculadas corretamente (testar 3+ casos: seller 20%, afiliado 5%, seller sem afiliado)
- ✅ Transferência Asaas é enviada com dados bancários corretos do seller/afiliado
- ✅ Webhook `transfer.sent` marca repasse como EXECUTADO
- ✅ Afiliado em carência não recebe repasse antes de 15 dias
- ✅ Retry automático se transferência falha (testa 2× com dados inválidos, depois sucesso)
- ✅ Idempotência: webhook duplicado não cria repasse duplicado
- ✅ Auditoria: admin vê histórico completo de repasses por seller/período
- ✅ Notificação enviada ao seller/afiliado após repasse executado

### 5b. Não-Funcionais

- Performance: repasse processado em < 3 segundos do webhook até update do banco (P95)
- Confiabilidade: 99.9% das transferências são bem-sucedidas T+1 (sem manual intervention)
- Observabilidade: cada passo logado em Sentry com context (pedido_id, seller_id, transfer_id_asaas)

### 5c. Métricas de Sucesso

| Métrica | Baseline | Meta | Prioridade |
|---------|----------|------|-----------|
| Taxa de sucesso de repasse (1ª tentativa) | — | 95% | Alta |
| Tempo entre PAGO e EXECUTADO | — | 24h (T+1) | Alta |
| Taxa de erro de transferência | — | < 1% | Alta |
| Cobertura de auditoria (repasses com log) | — | 100% | Média |

---

## 6. Milestones

### Milestone 1: Recebimento e Marcação de Pagamento
**Escopo**: US01
**Justificativa**: Sem validação do pagamento, o repasse não pode iniciar. Milestone isolado garante que o webhook é confiável antes de executar transferências.
**Aceite**: Webhook valida token, marca pedido PAGO, cria entrada em `repasses` com PENDENTE. Idempotência testada.

### Milestone 2: Cálculo e Transferência de Comissões
**Escopo**: US02, US03
**Justificativa**: Core de negócio — seller/afiliado recebem seus fundos. Combina cálculo + integração Asaas.
**Aceite**: Comissões calculadas corretamente. Transferências enviadas via Asaas. Retry funciona. Status atualizado para EXECUTADO.

### Milestone 3: Auditoria, Notificação e Carência
**Escopo**: US04, US05
**Justificativa**: Fecha fluxo com observabilidade e regras de negócio. Admin e seller ganham visibilidade.
**Aceite**: Histórico de repasses auditável. Notificações chegam. Afiliados em carência bloqueados. Painel mostra status.

---

## 7. Registro de Decisões

| Decisão | Reasoning | Alternativa Rejeitada |
|---------|-----------|----------------------|
| T+1 para repasse (não T+0) | Reduz falhas overnight, alinha com padrão bancário, dá tempo para identificar fraudes antes de executar transferência | T+0 (imediato) custaria operação overnight, mais risco |
| Comissão calculada em `payment_valor_liquido` e não bruto | Asaas já deduz suas taxas; marketplace lida com valor real que entra em conta | Usar valor bruto exigiria decontar taxas manualmente, duplica lógica |
| Afiliado com carência 15d, seller sem | Protege afiliado (mais risco, novo); seller é plataforma core | Mesma carência para ambos (simples) perderia diferenciação de risco |
| Job agendado (não event-driven) | Simplifica retry, evita duplicação de evento; mais debuggável que síncrono | Event-driven puro (via webhook) complexo com retry e timing |

---

## 8. Dependências e Referências

- **MCP Asaas** (`mcp-server/ASAAS_MCP.md`) — ferramentas para consulta/debug de transfers
- **Webhook Handler** (`src/app/api/webhooks/asaas/route.ts`) — já skeleton pronto
- **Tabela `repasses`** — será criada via migration Supabase
- **Notificação** — usa `resend` para e-mail (já integrado no projeto)
- **Configuração de comissões** — será definida em `sellers` e `afiliados` (tabelas existentes)

---

## 9. Notas Técnicas

- Comissões são percentuais configuráveis por seller (campo `comissao_percentual` em `sellers`) e por afiliado (campo `comissao_percentual` em `afiliados`)
- Retry de transferência: até 3 tentativas, com backoff exponencial (1h, 4h, 24h). Após 3 falhas, status = ERRO e flag para análise humana.
- RLS no Supabase: seller só vê seus repasses; afiliado só vê seus; admin vê todos.
- Idempotência: usar `ON CONFLICT (payment_id_asaas) DO UPDATE` para upsert de repasses.

