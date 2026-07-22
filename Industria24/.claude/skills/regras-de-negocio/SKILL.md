---
name: regras-de-negocio
description: Regras de negócio do marketplace Industria24h (industria24.com.br) — repasse, afiliados, venda futura, frete, aprovação de produto. Use SEMPRE antes de implementar ou alterar qualquer fluxo de dinheiro, pedido, comissão, frete ou disponibilidade de produto, e ao responder perguntas sobre como o marketplace funciona.
---

# Regras de Negócio — Industria24h

Fonte canônica: `docs/business-rules.md` (confirmado) e `docs/database.md` (nomes reais dos tipos). Documentos marcados como "rascunho inferido" (`backend-workflows.md`, `privacy-rules.md`, `api-connector.md`) são hipótese — em regra financeira, parar e perguntar em vez de assumir.

## Dinheiro (caminho crítico — nunca inferir)

- **Repasse plataforma:** Ind24 retém **5%** do pedido; 95% vai ao lojista. Campos em `LinhaItem` (nome real; "LinhaDoItem" nos docs antigos): `RepasseInd24`, `RepasseAfiliado`.
- **Repasse ao lojista é via PIX manual/automatizado (webhook /transfers)**, decisão registrada: NÃO usar Split/subconta Asaas.
- **Afiliados:** produto com `PermiteAfiliacao = true`; comissão = `PercentualAfiliado`; venda via link `?ref=` gera `RepasseAfiliado`. Já houve bug de comissão creditada ao afiliado errado (corrigido 21/07) — qualquer mudança aqui exige teste de compra com `?ref=`.
- Antes de gravar/alterar campo financeiro: `grep` de quem o lê; testar DDL/DML em `begin; … rollback;` via `supabase db query --linked`.

## Produtos

- Só aparece no marketplace com `StatusProduto = Aprovado` (curadoria admin em prod desde 21/07).
- Loja não deve nascer "Ativa" sem onboarding (bug conhecido, causa raiz não corrigida).

## Pedido

Fluxo: `Carrinho → Checkout → Pagamento (Asaas) → Pedido → Entrega → Repasse`.
Pendências sem regra documentada (perguntar antes de implementar): cancelamento/estorno, disputa, `ConsorcioPromotor`, `RetiradaNaLoja`, `ValorPedidoMinimo` por loja, PAGO parcial vs. total.

## Venda Futura (Mercado Futuro B2B)

- Comprar hoje, receber depois; disponibilidade no campo `Disponibilidade` do tipo `VendaFutura`.
- **Restrita a B2B:** gate CNPJ/IE (migration 0036) + aceite dos Termos do Mercado Futuro por pedido (checkbox no checkout, carimbo via service role — não tocar na RPC).
- Linhas com `venda_futura_id` NULL antigas são migração Bubble, não bug (verificado 22/07).

## Frete / logística

- Cálculo por CEP + peso + categoria, tabela `FaixaCEP` (CEPInicial, CEPFinal, ICMS, AdValorem, KgAdicional, PesoFinal).
- Vitrine filtra por CEP do comprador (Manaus tem estoque; POA = 0 é comportamento correto, não bug).
- Afiliado logístico e parceiro logístico têm termos próprios com gate de aceite (`/termos/[slug]`).

## Regra de ouro

Antes de propor feature "nova", checar se já existe no Bubble (`docs/` + memória `industria24h-bubble-features-ja-existentes`). Paridade Bubble é o critério de pronto; botão morto no Bubble (ex.: "Dados" do parceiro logístico) não se implementa.

Se uma regra se revelar diferente do documentado durante a implementação, atualizar `docs/business-rules.md` na mesma sessão marcando a fonte.
