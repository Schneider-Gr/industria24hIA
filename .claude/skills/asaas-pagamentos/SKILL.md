---
name: asaas-pagamentos
description: Integração de pagamentos Asaas do Industria24h — checkout, webhooks, cálculo/divisão de comissão (split lógico seller/afiliado/plataforma), ledger de repasse, estorno interno. Use SEMPRE ao implementar ou alterar pagamento, cobrança, webhook Asaas, repasse, comissão de afiliado, ou qualquer coisa que envolva "split" de valores entre marketplace/lojista/afiliado — mesmo que o pedido use o termo "split do Asaas", pois esse recurso nativo foi descartado neste projeto e a pergunta quase sempre é sobre a divisão lógica interna.
---

# Asaas / Pagamentos — Industria24h

## ⛔ Proteção de produção (conta compartilhada com o Bubble industria24h.com.br)

A conta Asaas de **produção** deste projeto é a mesma usada pelo projeto legado em Bubble, **industria24h.com.br**, que está no ar. Qualquer ação destrutiva nela afeta os dois projetos.

- **Proibido para qualquer agente (incluindo QA/teste) acessar o painel web do Asaas em modo Produção** (`asaas.com`, não `sandbox.asaas.com`) para criar, editar ou remover API keys, integrações, webhooks ou contas de acesso. Cadastro/alteração de webhook é sempre ação manual do dono no painel — nunca de um agente.
- **Nenhum agente ou CLI, em nenhuma circunstância, está autorizado a remover/revogar API keys do painel do Asaas** (produção ou sandbox) — nem via painel web, nem via API do Asaas, nem via qualquer script/CLI. Rotação ou remoção de chave é sempre ação manual do dono, feita por ele diretamente no painel.
- **Proibido chamar qualquer função mutável de `src/lib/asaas.ts` (`ensureCustomer`, `createPayment`, `cancelPayment`) contra a API de produção (`api.asaas.com`) fora do fluxo real de um usuário/pedido real.** Teste e QA usam exclusivamente `api-sandbox.asaas.com` (`ASAAS_ENV` ≠ `"production"`).
- Antes de rodar qualquer teste que toque Asaas, **confirme no código/env** (nunca suponha) o valor resolvido de `ASAAS_ENV` no ambiente em que vai rodar.
- `cancelPayment` faz `DELETE /payments/{id}` — é destrutivo sobre uma cobrança real se rodar em produção. Nunca chamar em teste/QA.
- Se uma tarefa exigir de fato uma ação em produção no Asaas (ex.: investigar cobrança real, suporte a lojista), é ação que **exige confirmação explícita do usuário antes de executar** — nunca autônoma.
- Ver spec: `docs/prds/018-protecao-producao-asaas.md`.

## Recursos nativos vs custom (checar docs.asaas.com antes de estimar)

- **Nativos no Asaas:** split de pagamento (divide a cobrança automaticamente entre contas no momento do pagamento), assinatura/recorrência, antecipação de recebíveis.
- **NÃO nativo:** emissão de NF-e (precisa de solução própria/terceiro).
- **Decisão registrada do projeto (2026-07-25):** o Split de Pagamento nativo do Asaas e a transferência automática via API (`POST /transfers`) foram **descartados**. Repasse ao lojista/afiliado é um **ledger interno** (tabela `repasses`) com pagamento manual fora do sistema. Não reabrir essa decisão sem o dono pedir explicitamente — se alguém pedir "split do Asaas", confirme se quer o recurso nativo (reabre a decisão) ou a lógica de divisão de comissão já implementada (o caso comum).

## Estado atual (confirmado no código, 2026-08-05)

- Checkout Asaas funcionando em prod: `src/lib/asaas.ts` só tem `ensureCustomer`, `createPayment`, `cancelPayment`, `getPixQrCode` — **não existe** função de transferência (`createPixTransfer` ou similar).
- Webhook de confirmação de pagamento em prod: `src/app/api/asaas/webhook/route.ts`. Ver seção "Webhook" abaixo.
- Ledger de comissão/repasse em prod: migration `supabase/migrations/0084_admin_repasses_estorno.sql` + painel `src/app/(admin)/admin/repasses/page.tsx`. Ver seção "Divisão de comissão (o \"split\")" abaixo.
- PR #43 (`feat/repasse-pix-asaas`, migration 0058, automação de transferência) está **fechado e é referência morta** — não usar como base de rebase, não afirmar que repasse automático existe.
- PRD autoritativo: `docs/prd/web-004-sistema-repasse.md` (v2.0, reescrito 2026-08-05 para refletir este estado real).

## Divisão de comissão (o "split" deste projeto)

Não há chamada à API do Asaas para dividir dinheiro — a divisão é calculada e registrada no banco, e o repasse físico ao beneficiário é manual (PIX operado pelo financeiro, fora do sistema).

- **Percentuais:** Ind24 retém **5%** do pedido; **95%** vai ao lojista (campo `RepasseInd24`/`repasse_vendedor` em `linha_itens`). Se houver afiliado (compra via link `?ref=`), o percentual de afiliado sai da fatia do que sobra — ver `PercentualAfiliado` por produto em `regras-de-negocio`.
- **Cálculo:** RPC `calcular_repasses_pedido(pedido_id)` (SECURITY DEFINER, só admin) lê `linha_itens.repasse_vendedor`/`repasse_afiliado` e faz upsert em `repasses` — uma linha por `(pedido_id, destino, afiliado_id)`, `destino ∈ {seller, afiliado}`.
- **Idempotência do cálculo:** `on conflict (...) do update ... where status = 'pendente'` — rodar de novo não duplica nem sobrescreve um repasse que já saiu de `pendente` (`transferido`/`estornado`).
- **Status do ledger:** `pendente`, `transferido`, `falhou`, `inelegivel`, `estornado`. Não há transição automática para `transferido` — é o admin que marca (ou uma rotina futura fora deste escopo) depois de fazer o PIX manual.
- **Estorno:** `admin_estornar_pedido(pedido_id, motivo)` cancela o pedido, libera itens não transferidos e marca repasses `pendente` como `estornado`. **Não chama a Asaas** — reversão financeira real do lado do comprador é manual.
- **RLS:** `repasses_admin_all` — só admin lê/escreve a tabela `repasses`. Seller/afiliado não têm visão própria do ledger hoje (não confundir com telas de "meus repasses" que possam existir na paridade Bubble — checar `paridade-bubble` antes de assumir que existe).

## Webhook (confirmação de pagamento — o que de fato existe)

- Endpoint: `POST /api/asaas/webhook`. Autenticação: Asaas envia o token configurado no painel no header `asaas-access-token`; o handler compara com a env `ASAAS_WEBHOOK_TOKEN` e responde `401` se não bater.
- Eventos tratados como pago: `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`. Como cancelado: `PAYMENT_OVERDUE`, `PAYMENT_DELETED`, `PAYMENT_CANCELED`, `PAYMENT_REFUNDED`.
- Sempre responde `200` para evento irrelevante/não reconhecido — a doc oficial do Asaas (docs.asaas.com/docs/sobre-os-webhooks) interrompe a fila de sincronização após **15 falhas consecutivas** (resposta não-2xx), então erro genérico é pior que ignorar.
- Antes de creditar, confere `asaas_cobranca_id` do pedido contra `payment.id` do evento **e** `payment.value >= valor_pedido` — webhook forjado ou duplicado com valor divergente não credita.
- Entrega é "at least once" (a Asaas pode reenviar o mesmo evento) — o handler não faz dedupe explícito por `id` do evento; reprocessar reescreve os mesmos campos, então é tolerável, mas notificações WhatsApp/despacho de corrida podem, em teoria, duplicar num reenvio raro.

## Regras de implementação

- Sandbox primeiro; nunca simular resposta do Asaas com valor fixo — chamada real ou botão desabilitado com "integração pendente" (CLAUDE.md do repo).
- Webhook: validar autenticidade do evento (`asaas-access-token` vs `ASAAS_WEBHOOK_TOKEN`) e o valor recebido antes de creditar qualquer coisa — ver seção "Webhook" acima.
- Chaves Asaas só em `.env`/secrets — nunca em código, doc ou log.
- Mudança em `calcular_repasses_pedido`, `admin_estornar_pedido` ou qualquer coisa que grave em `repasses` exige teste `begin…rollback` no banco e teste de compra fim-a-fim antes de merge.
- Se o pedido citar "PIX automático"/"transferência automática" de repasse: **não existe** — é ledger manual (ver "Estado atual"). Não reabrir a decisão de 2026-07-25 sem o dono pedir.
