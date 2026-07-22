---
name: onboarding-seller
description: Fluxo de entrada e ciclo de vida do lojista (seller) no Industria24h — cadastro, aprovação, chave PIX, termos, painel. Use ao trabalhar em qualquer tela ou regra do seller, cadastro de loja, ou investigar problema de loja/lojista.
---

# Onboarding e Ciclo do Seller — Industria24h

## Fluxo esperado

`Cadastro → Onboarding (dados da loja) → Aprovação → Chave PIX cadastrada → Aceite de termos → Produtos (curadoria) → Primeira venda → Repasse`

## Bugs e cicatrizes conhecidas

- 🔴 **Loja nasce "Ativa" sem completar onboarding** — causa raiz NÃO corrigida no código; já gerou lojas "(sem nome)" em prod (limpas via SQL). Qualquer trabalho em cadastro de loja deve considerar corrigir isso.
- Nome real do tipo: `Loja_ecommerce` (não "Empresa"/"Loja").

## Regras por etapa

- **Chave PIX:** cadastro com trilha de auditoria (PR #14, migrations 0034-0036). Mudança de chave PIX é evento sensível — auditar em caso de conta comprometida. DICT lookup ainda pendente.
- **Termos:** parceiro logístico e afiliados têm termos próprios com gate de aceite (`/termos/[slug]`); venda futura exige CNPJ/IE + aceite por pedido.
- **Produtos:** entram em curadoria; só `StatusProduto = Aprovado` aparece na vitrine. Admin tem fila de pendências com badges.
- **Painel `/seller`:** 13 seções com paridade Bubble validada; pedidos mostram Repasse Ind 5% + badge Transferência + coluna Venda Futura. Tour guiado ancorado no menu (PR #54).
- **B2B:** gate CNPJ/IE (0036) libera mercado futuro; `preco_faixa` ainda pendente.
- **Crédito/Parceiro logística:** PR #35 aberto não mergeado, sem dado real, schema pendente — não tratar como existente.

## Ao mexer no seller

1. Conferir paridade Bubble antes (skill `paridade-bubble`); seller já foi validado seção a seção — não "melhorar" sem pedido.
2. Regra financeira nova → skill `regras-de-negocio` + `asaas-pagamentos`.
3. QA logado: o fluxo completo de onboarding só se valida criando loja de teste, não só olhando tela.
