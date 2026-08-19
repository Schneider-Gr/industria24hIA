---
name: asaas-pagamentos
description: Integração de pagamentos Asaas do Industria24h — checkout, webhooks, repasse PIX, split. Use ao implementar ou alterar qualquer coisa em pagamento, cobrança, estorno, repasse ou webhook Asaas.
---

# Asaas / Pagamentos — Industria24h

## ⛔ Proteção de produção (conta compartilhada com o Bubble industria24h.com.br)

A conta Asaas de **produção** deste projeto é a mesma usada pelo projeto legado em Bubble, **industria24h.com.br**, que está no ar. Qualquer ação destrutiva nela afeta os dois projetos.

- **Proibido para qualquer agente (incluindo QA/teste) acessar o painel web do Asaas em modo Produção** (`asaas.com`, não `sandbox.asaas.com`) para criar, editar ou remover API keys, integrações, webhooks ou contas de acesso. Cadastro/alteração de webhook é sempre ação manual do dono no painel — nunca de um agente.
- **Proibido chamar qualquer função mutável de `src/lib/asaas.ts` (`cancelPayment`, `createPayment`, `createPixTransfer`, `ensureCustomer`) contra a API de produção (`api.asaas.com`) fora do fluxo real de um usuário/pedido real.** Teste e QA usam exclusivamente `api-sandbox.asaas.com` (`ASAAS_ENV` ≠ `"production"`).
- Antes de rodar qualquer teste que toque Asaas, **confirme no código/env** (nunca suponha) o valor resolvido de `ASAAS_ENV` no ambiente em que vai rodar.
- `cancelPayment` faz `DELETE /payments/{id}` — é destrutivo sobre uma cobrança real se rodar em produção. Nunca chamar em teste/QA.
- Se uma tarefa exigir de fato uma ação em produção no Asaas (ex.: investigar cobrança real, suporte a lojista), é ação que **exige confirmação explícita do usuário antes de executar** — nunca autônoma.
- Ver spec: `docs/prds/018-protecao-producao-asaas.md`.

## Recursos nativos vs custom (checar docs.asaas.com antes de estimar)

- **Nativos no Asaas:** split de pagamento, assinatura/recorrência, antecipação de recebíveis.
- **NÃO nativo:** emissão de NF-e (precisa de solução própria/terceiro).
- **Decisão registrada do projeto:** repasse ao lojista via **PIX** (transferência), NÃO via Split/subconta Asaas. Não reabrir essa decisão sem o dono pedir.

## Estado atual

- Checkout Asaas funcionando em prod (rebuild).
- Repasse PIX automático: PR #43 pronto (migration 0058 + webhook `/transfers`), **pendente do usuário**: aplicar 0058, configurar webhook no painel Asaas, QA em sandbox. Não afirmar que repasse automático está ativo.
- 5 decisões de negócio do repasse continuam pendentes do dono (memória `industria24h-repasse-decisoes-pendentes-2026-07-10`) — não decidir por ele.

## Regras de implementação

- Sandbox primeiro; nunca simular resposta do Asaas com valor fixo — chamada real ou botão desabilitado com "integração pendente" (CLAUDE.md do repo).
- Webhook: validar autenticidade do evento antes de creditar qualquer coisa; idempotência obrigatória (evento pode chegar 2×).
- Valores de repasse: 5% Ind24 / 95% lojista + `RepasseAfiliado` quando houver `?ref=` (ver skill `regras-de-negocio`).
- Chaves Asaas só em `.env`/secrets — nunca em código, doc ou log.
- Mudança em fluxo de crédito exige teste `begin…rollback` no banco e teste de compra fim-a-fim antes de merge.
