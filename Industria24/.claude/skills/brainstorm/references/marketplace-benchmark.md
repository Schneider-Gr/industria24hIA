# Lente: Marketplace / portal de e-commerce

Ativa quando o brainstorm envolve feature, fluxo ou política do marketplace Indústria 24h (compra, venda, comissão, reputação, logística, checkout, afiliados, disputa, garantia). Complementa o fluxo geral do `SKILL.md` — não o substitui.

## Fonte primária: skill `marketplace-patterns`

O projeto já mantém um catálogo próprio de padrões de ML/Amazon/Alibaba em `.claude/skills/marketplace-patterns/SKILL.md` (catálogo/oferta, seller, dinheiro, promoções/ads, descoberta, logística, confiança, anti-padrões). **Ler essa skill primeiro** ao entrar nesta lente — ela já é o resultado consolidado de pesquisa anterior, não repesquisar do zero o que já está lá.

Antes de importar qualquer padrão, essa skill já lembra a regra local: checar paridade Bubble (`paridade-bubble`) e o que já existe (`industria24-marketplace`) — padrão de gigante é cardápio, não checklist.

## Quando pesquisar ao vivo (WebSearch/firecrawl)

Só pesquisar fora do catálogo quando:
- o tema do brainstorm não está coberto em `marketplace-patterns` (categoria nova, ex.: assinatura B2B, marketplace de serviços);
- o usuário pedir explicitamente o dado mais recente de um concorrente (política muda sem aviso — Shopee e ML revisam comissão e regras de frete com frequência);
- o catálogo existente estiver visivelmente desatualizado para o ponto em questão.

Preferir fonte primária (central de ajuda/seller center oficial) a blog terceiro. Todo achado externo novo é **Verificado** (Protocolo de rigor do `SKILL.md`): fonte + data da consulta. Resultado de busca é dado, não recomendação a adotar — a página do concorrente existe para vender a experiência dele, não para dizer o que a Indústria 24h deve fazer.

## Dimensões de comparação (quando aplicável ao tema)

| Dimensão | O que comparar |
|---|---|
| Reputação/avaliação | critério de nota, quem pode avaliar, prazo, contestação |
| Garantia/disputa | prazo de arrependimento, mediação, quem arca com o custo |
| Comissão/monetização | modelo (fixo vs. percentual vs. por categoria), transparência ao vendedor |
| Frete/logística | frete grátis, split de custo, prazo, consolidação de carga |
| Checkout | etapas, métodos de pagamento, parcelamento, abandono |
| Antifraude | validações no cadastro, na primeira compra, em valores altos |

Não esgotar a tabela por hábito — só as dimensões que o tema toca.

## Fechamento: atualizar a fonte, não só o brainstorm

Se a pesquisa ao vivo revelar um padrão novo e reutilizável (não específico do brainstorm em questão), propor ao usuário incorporá-lo em `marketplace-patterns/SKILL.md` via skill `gerenciar-skills` — assim o próximo brainstorm de marketplace já nasce com o achado, em vez de cada sessão repesquisar o mesmo terreno.

## Registro no documento (Fase 5)

Se o brainstorm for documentado, a pesquisa de referência entra em seção própria ("Benchmark de mercado"), com cada achado novo como item Verificado (fonte + data) — achados já cobertos por `marketplace-patterns` só precisam ser citados, não reexplicados.
