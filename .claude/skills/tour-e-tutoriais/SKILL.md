---
name: tour-e-tutoriais
description: Tour guiado do seller e site de tutoriais do Industria24h — onde vivem, como atualizar quando uma tela muda. Use ao alterar telas do seller/afiliado, trabalhar no tour spotlight, ou atualizar tutorial.industria24.com.br.
---

# Tour e Tutoriais — Industria24h

## Tour guiado do seller (in-app)

- Implementado no PR #54 (em prod): spotlight **ancorado nos itens do menu** do painel `/seller`.
- Mudou o menu ou renomeou seção → atualizar as âncoras do tour NA MESMA sessão; tour quebrado aponta para elemento inexistente sem falhar build.
- QA do tour exige sessão logada de seller — não dá para validar deslogado.

## Site de tutoriais (externo)

- **tutorial.industria24.com.br** — site estático no ar via CNAME no registro.br (HTTPS 200).
- Conteúdo: fluxo do afiliado logístico em 2 trilhas / 11 passos, mapeado dos vídeos originais + painel `/afiliadologistica`.
- Fonte e detalhes na memória `industria24h-tutorial-afiliado-logistica`.
- Mudança no fluxo do afiliado (telas, termos, repasse) → o tutorial externo fica defasado silenciosamente; incluir a atualização dele no escopo do PR que muda o fluxo.

## Regra geral

Tela com tour ou tutorial apontando para ela entra no checklist de "pronto": código + âncora do tour + página do tutorial coerentes. Screenshot antigo em tutorial após redesign (Aço & Sinal) = atualizar imagem, não só texto.
