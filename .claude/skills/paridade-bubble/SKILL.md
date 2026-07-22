---
name: paridade-bubble
description: Garantir paridade com o app Bubble legado (industria24h.com.br) antes de propor ou implementar features no rebuild. Use ao planejar feature nova, comparar telas seller/admin, ou quando surgir dúvida se algo "já existe".
---

# Paridade Bubble — Industria24h

O critério de pronto do rebuild é **replicar 100% do Bubble**, não melhorar. Antes de propor feature "nova":

1. Checar `docs/` (feature-map.md, pages.md, admin-module.md, business-rules.md) e a raiz do repo (00–18-*.md, engenharia reversa completa).
2. Bubble já tem venda futura e desconto — features "novas" costumam já existir (memória `industria24h-bubble-features-ja-existentes`).
3. **Nomes reais dos tipos** estão em `docs/database.md`. `bubble-export/_especulativo/` inventou nomes (`Pedido`, `Cotacao`, `Empresa`); os reais são `LinhaItem`, `Loja_ecommerce`, `Produto_ecommerce`. Nunca usar nome de campo que não esteja confirmado.
4. Grau de confiança por doc: cada `.md` diz no topo se é "extração real", "rascunho inferido" ou "especulativo". Rascunho inferido = hipótese; em schema ou regra financeira, perguntar ao usuário.
5. **Botão morto no Bubble não se implementa** (ex.: botão "Dados" do parceiro logístico). Paridade inclui reproduzir a ausência.
6. Divergência descoberta durante implementação → atualizar o doc na mesma sessão, marcando "confirmado durante implementação de X em AAAA-MM".
7. Módulo Consignado (`docs/consignado-module.md`) é Fase 2 — não misturar com o marketplace sem pedido explícito.

Status de paridade já validada (não redescobrir): seller 13 seções OK; venda futura coluna seller 100%; termos parceiro logístico 100%; repasse Ind 5% + badge Transferência em /seller/pedidos.
