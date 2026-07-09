# Design System — Indústria 24h

## Contexto do Produto
- **O que é:** marketplace B2B industrial da Amazônia (Manaus) — comprar direto da indústria/produtor; loja grátis, plataforma retém 5% por item.
- **Para quem:** compradores B2B (mercadinhos, restaurantes, construtoras) e sellers fabricantes/produtores. 3 superfícies: vitrine do comprador, painel do seller, painel admin.
- **Categoria/pares pesquisados:** Mercado Livre, Leroy Merlin, Alibaba, Grainger, Mercado Eletrônico (screenshots 07/07/2026).
- **Tipo:** web app (marketplace + 2 painéis).

## Direção Estética
- **Direção:** Industrial/Utilitária com dobra editorial — function-first nos painéis; primeira dobra da vitrine composta como pôster, não documento.
- **Decoração:** intencional e mínima. Sem gradiente roxo-decorativo, sem grid de 3 ícones em bolinha, sem blob.
- **Mood:** "ERP bem feito com cara de loja" — confiável, denso onde precisa, preço sempre protagonista.

## Cor (herdada da marca no ar — industria24h.com.br)
- **Abordagem:** balanceada. Roxo é identidade, laranja é ação, o resto é neutro.
- **Primária (header/nav/identidade):** Roxo 800 `#4C1D95` · Roxo 900 `#3F1C72` (nav secundária/sidebar)
- **CTA/ação:** Laranja do logo `#F04E23` (botão primário; hover escurece ~8%)
- **Destaque:** Amarelo `#E2AF00` (o "24h" do logo, badges, item ativo na sidebar)
- **Apoio/ilustração:** Teal `#2BC1A8` (setas, ícones, nunca texto sobre branco)
- **Ink:** `#121212` texto · `#374151` secundário · `#7C7C7C` muted
- **Superfícies:** fundo `#FAFAF9` · cards `#FFFFFF` · borda `#E5E7EB`
- **Semânticas:** sucesso `#16A34A` · alerta `#D97706` · erro `#DC2626` · info `#2563EB`
- **Dark mode:** superfícies re-projetadas (fundo `#171420`, card `#211D2E`, borda `#3B3450`); roxos viram acento claro `#C4B5FD` para texto; saturação dos semânticos -15%.
- **Banners:** usar os banners reais do site atual, já em `public/banners/` (banner-principal.png, banner-mercado-futuro.png, banner-3.jpg + mobile).

## Tipografia
- **Única família:** Inter 400–800 (Google Fonts, via `next/font`) — em display/títulos, corpo/UI e preços/dados (com `font-variant-numeric: tabular-nums`). Fidelidade ao site real: industria24h.com.br usa Inter em toda a UI; decisão 2026-07-09 substitui a tipografia autoral v1 (Cabinet Grotesk/Instrument Sans/Geist).
- **Código:** JetBrains Mono (só em telas técnicas/admin).
- **Loading:** `next/font/google` self-host, fallback `system-ui`.
- **Escala:** 12 (caption/kicker) · 13-14 (tabela/UI) · 16 (corpo) · 19 (h3) · 24 (h2 painel) · 28-34 (h2 vitrine) · 44-52 (hero). Kickers uppercase com letter-spacing .12em.

## Espaçamento
- **Base:** 4px.
- **Densidade:** confortável na vitrine; compacta nos painéis (células de tabela py-9px).
- **Escala:** 2xs(2) xs(4) sm(8) md(16) lg(24) xl(32) 2xl(48) 3xl(64).

## Layout
- **Abordagem:** híbrida — grid disciplinado 12 col nos painéis (sidebar 170-240px fixa); editorial na vitrine (banner full-bleed, seções tituladas).
- **Max width:** 1080-1280px conteúdo; painéis fluidos.
- **Border radius:** sm 4px (botões, tags, inputs) · md 8px (cards, mockups) · NADA de rounded-full em containers. Radius grande só em avatar.
- **Cards de produto:** foto-primeiro, nome 2 linhas, preço Geist 18px bold, metadado 11px muted.

## Moção
- **Abordagem:** mínima-funcional. Só transições de estado (hover, abrir/fechar, skeleton).
- **Easing:** enter ease-out · exit ease-in · move ease-in-out.
- **Duração:** micro 50-100ms · curta 150-250ms. Nada acima de 400ms. Sem animação de scroll.

## Regras anti-slop
- Proibido: gradiente roxo decorativo, grid 3 colunas de ícones em círculo, tudo centralizado, border-radius uniforme bolha, botão com gradiente, Inter/Roboto/Poppins como primária.
- Preço nunca em fonte proporcional. Status sempre como tag retangular (radius 4px) com par fundo-claro/texto-escuro.

## Decisões
| Data | Decisão | Racional |
|------|---------|----------|
| 2026-07-07 | Sistema v1 criado | /design-consultation: pesquisa ML/Leroy/Alibaba/Grainger/ME + extração da paleta real do site Bubble |
| 2026-07-07 | Paleta herdada do site atual (roxo/laranja/amarelo/teal) | Decisão do usuário: 158 usuários reais conhecem a marca; banners preservados |
| 2026-07-07 | Laranja #F04E23 como CTA | Extraído do logo "24h"; assumido pelo agente e confirmado no ship |
| 2026-07-07 | Tipografia nova (Cabinet Grotesk/Instrument Sans/Geist) | Bubble usava genérica; rebuild ganha voz própria sem tocar na cor da marca |
| 2026-07-09 | Revertido: tipografia única Inter (fiel ao site real) | Pedido explícito do usuário de fidelidade 100% (navegação, tipologia, logo, banners); `public/logo-industria24h.png` baixado do CDN Bubble e usado no header/footer/sidebars no lugar do logo-texto |
