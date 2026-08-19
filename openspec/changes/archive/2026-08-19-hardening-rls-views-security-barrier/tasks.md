## 1. Hardening das 11 views

- [x] 1.1 `lojas_vitrine`, `afiliado_ganhos`, `logistica_pedidos`, `logistica_itens` — migration 0124, PR #294
- [x] 1.2 `pedidos_cliente`, `linha_itens_cliente`, `parceiros_publicos`, `coletiva_pagamentos` — migration 0126, PR #297
- [x] 1.3 `favoritos_contagem`, `avaliacoes_produto_resumo`, `coletiva_participantes_total` — migration 0130, PR #307 (issue #306)
- [x] 1.4 Confirmar em produção via `pg_class.reloptions` que as 11 views têm `security_barrier=true` (2026-08-19)

## 2. Documentação

- [x] 2.1 Atualizar `.claude/skills/rls-seguranca/SKILL.md` (web/ e espelho em Industria24/) com a seção "Views que contornam RLS de propósito"
- [x] 2.2 Criar esta spec (`seguranca-views-security-barrier`) consolidando a regra

## 3. Fechamento

- [ ] 3.1 `openspec archive hardening-rls-views-security-barrier` após revisão
