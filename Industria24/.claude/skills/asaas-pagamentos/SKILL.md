---
name: asaas-pagamentos
description: Integração de pagamentos Asaas do Industria24h — checkout, webhooks, repasse PIX, split. Use ao implementar ou alterar qualquer coisa em pagamento, cobrança, estorno, repasse ou webhook Asaas.
---

# Asaas / Pagamentos — Industria24h

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
