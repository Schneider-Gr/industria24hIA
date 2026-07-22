---
name: seo-industria24
description: SEO do industria24.com.br — soft-404 aberto, sitemap, metadados, indexação. Use ao trabalhar em SEO, páginas 404, sitemap, metadados de produto/loja, ou quando o Google Search Console reportar problema.
---

# SEO — Industria24h

## 🔴 Bug aberto: soft-404

`notFound()` devolve **HTTP 200** em prod para produto/loja/categoria inexistentes — o Google indexa páginas vazias como válidas. Ocorre em local, preview e prod.

**Antes de investigar, ler a memória `industria24h-soft-404-notfound-producao`.** 4 causas já foram DESCARTADAS com teste: ISR, `not-found.tsx`, Sentry, bump de dependência. Não re-testar essas. PR #70 entregou só a página 404 bonita, não o status code.

Critério de resolvido: `curl -sI` numa rota inexistente devolvendo 404 real **em produção** (não preview).

## Fundamentos

- Domínio canônico: **industria24.com.br** (sem h). O Bubble legado (com h) não deve competir no índice — conferir redirects/canonical se aparecer duplicidade.
- Vitrine filtra por CEP: crawler sem CEP precisa ver conteúdo indexável — validar o que o Googlebot recebe (fetch sem cookie), não só o browser logado.
- Metadados por página: produto (nome, preço, imagem — considerar JSON-LD Product), loja, categoria. Hero usa fonte Archivo (design "Aço & Sinal").
- Sitemap e robots: conferir que rotas de painel (`/seller`, `/admin`) estão fora do índice.
- Existe crew de SEO publicada no CrewAI Studio (ver skill `crews-ia`) para produção de conteúdo.

## Validação

- Status code + conteúdo via `curl`, nunca só browser (cache/hidratação enganam).
- Search Console: propriedade do domínio sem h; checar cobertura após qualquer fix de 404.
