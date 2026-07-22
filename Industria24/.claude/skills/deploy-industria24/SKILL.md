---
name: deploy-industria24
description: Deploy e verificação de produção do Industria24h (industria24.com.br) — Vercel prod vs preview, domínios, confirmação real de "no ar". Use quando o pedido envolver deployar, publicar, ou afirmar que algo está em produção.
---

# Deploy — Industria24h

## Domínios (não confundir)

- **industria24.com.br** (SEM h) = rebuild Next.js na Vercel. É a produção do código deste repo.
- **industria24h.com.br** (COM h) = Bubble legado. Nunca é alvo de deploy daqui.
- tutorial.industria24.com.br = site estático de tutorial (CNAME registro.br).

## Regras

1. **Push ≠ produção.** Push/merge gera Preview na Vercel; produção exige promote/`vercel --prod` ou merge em master com deploy automático — confirmar qual está ativo antes de afirmar.
2. **"Deployado" só depois de `vercel inspect`** (ou hash do bundle servido / rota respondendo com a mudança). Nunca afirmar "no ar" sem essa prova.
3. QA pós-deploy mínimo: rotas críticas respondendo 200 (`/`, produto, loja, `/seller/pedidos`, `/termos/[slug]`), e a mudança específica visível.
4. ⚠ Soft-404 conhecido: `notFound()` devolve HTTP 200 em prod (memória `industria24h-soft-404-notfound-producao`) — não usar status 404 como prova de rota inexistente, nem 200 como prova de rota válida.
5. Migrations acompanham deploy: aplicar e **verificar objeto real** via `supabase db query --linked` (projeto `tiwdqgyeyvceaiqqwitc`) antes de considerar o deploy completo. Ver skill `migrations-industria24`.
6. Commit no repo com hook graphify: prefixar `GRAPHIFY_SKIP_HOOK=1`.
7. Pedido de "deploy" ambíguo entre projetos (industria24h ≠ instal-visual ≠ visual-connect): confirmar o alvo antes de qualquer comando.
