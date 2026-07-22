---
name: qa-prod-industria24
description: QA de produção do industria24.com.br — rotas críticas, filtro de CEP, checkout com afiliado, e-mail transacional. Use após deploy, ao investigar bug reportado em prod, ou quando o usuário pedir para validar algo no ar.
---

# QA de Produção — Industria24h

Alvo: **industria24.com.br** (rebuild). Confirmar antes que o deploy testado é o servido (`vercel inspect`).

## Checklist de rotas

- `/` vitrine com filtro de CEP: **Manaus mostra produtos (≈24); POA mostra 0 — isso é correto**, não bug.
- Produto, loja, categoria, `/seller/pedidos`, `/admin`, `/termos/termos-mercado-futuro`, `/desenvolvedores`.
- ⚠ **Soft-404:** `notFound()` responde HTTP 200 em prod. Validar conteúdo da página, não o status code. 4 causas já foram descartadas com teste — ler memória `industria24h-soft-404-notfound-producao` antes de investigar.

## Fluxos críticos

- **Checkout com `?ref=` de afiliado:** teste de compra pendente desde 21/07; qualquer mudança em comissão exige esse teste (bug de afiliado errado já aconteceu).
- **Venda futura:** só B2B (gate CNPJ/IE) + checkbox de termos no checkout.
- **E-mail transacional NÃO SAI:** domínio `industria24.com.br` está Failed no Resend (faltam DKIM/SPF/MX no registro.br) — falha de e-mail em QA não é bug de código até isso ser resolvido.

## Dados

- Verificação de dado em prod: `supabase db query --linked` (projeto `tiwdqgyeyvceaiqqwitc`), nunca curl direto.
- Antes de declarar um número errado, validar coluna-fonte, data-base e unidade no banco.
- Linhas antigas com `venda_futura_id` NULL = migração Bubble, não bug.

## Browser

- QA logado: localizar a aba com sessão via `Target.getTargets`; OAuth é por aba.
- Timeout CDP 2× na mesma aba = aba morta; reconectar, não re-tentar. Se houver API/CLI, usar antes do browser.
