# Design System — Indústria 24h

> **Nota de reconstrução (2026-07-17):** este arquivo foi apagado do checkout
> em algum momento não identificado (sem acesso a shell nesta sessão para
> rodar `git log -- DESIGN.md`; recomenda-se rodar isso manualmente para
> entender quando/por quê). Duas ferramentas do projeto dependem dele em
> tempo de carregamento — `tools/design-loop/graph.ts` e
> `tools/design-loop/build-graph.ts` fazem `readFileSync(.../DESIGN.md)` no
> import e **quebram sem este arquivo** — então a ausência não era só
> documental, o design-loop estava inoperante. Este documento foi
> reconstruído a partir de fontes verificáveis no código real (não de
> memória): `src/app/globals.css` (tokens `@theme`), `src/components/vitrine/ui.tsx`,
> `src/components/carrinho/carrinho.tsx`, `src/app/(seller)/seller/reputacao/page.tsx`,
> `tools/design-loop/{graph.ts,build-graph.ts,validar.ts}`, e os dois
> documentos já produzidos nesta sessão (`docs/auditoria-ml-seller-panel-2026-07-17.md`,
> `docs/redesign-vitrine-navegacao-ml-2026-07-17.md`). Onde o conteúdo antigo
> não pôde ser confirmado (ex.: "Barra de garantias"), isso está marcado
> explicitamente como proposta, não como algo já implementado.

## Contexto do Produto
- **O que é:** marketplace B2B industrial comprar direto da indústria/produtor; loja grátis, plataforma retém 5% por item.
- **Para quem:** compradores B2B (mercadinhos, restaurantes, construtoras) e sellers fabricantes/produtores. 3 superfícies: vitrine do comprador, painel do seller, painel admin.
- **Categoria/pares pesquisados originalmente:** Mercado Livre, Leroy Merlin, Alibaba, Grainger, Mercado Eletrônico (2026-07-07). Aprofundado em Mercado Livre (navegação, galeria, busca, produto, painel de vendedor) em 2026-07-17 — ver os dois documentos de auditoria citados acima.
- **Tipo:** web app (marketplace + 2 painéis).

## Direção Estética
- **Direção:** Industrial/Utilitária com dobra editorial — function-first nos painéis; primeira dobra da vitrine composta como pôster, não documento.
- **Decoração:** intencional e mínima. Sem gradiente roxo-decorativo, sem grid de 3 ícones em bolinha, sem blob.
- **Mood:** "ERP bem feito com cara de loja" — confiável, denso onde precisa, preço sempre protagonista.

## Cor — identidade "Leroy Merlin" (OFICIAL desde 2026-07-29, substitui "Aço & Sinal")
Vale para **todo o app**: vitrine do comprador e painéis seller/admin. Tokens em `src/app/globals.css` (`@theme inline`), prefixo `lm-*`.

- **Racional:** referência estrutural e de paleta explicitamente pedida pelo dono a partir de `leroymerlin.com.br` — cores extraídas ao vivo via `getComputedStyle` em 2026-07-29 (Verificado, fonte + data registradas), com uma correção deliberada: **onde a Leroy Merlin usa verde (CTA, hover), o Industria24h usa azul** — decisão do dono na mesma sessão. O azul de ação não veio da LM (que não tem esse papel em azul); foi reaproveitado do token `aco-600` já testado na identidade anterior, em vez de um hex novo sem fonte.
- **Azul de ação (CTA/interação, substitui o verde da LM):** `--color-lm-azul #1E5A8A` (botão primário, link ativo, hover de item de menu, badge de ação) · `--color-lm-azul-escuro #164569` (hover do CTA — **Inferido**, derivado ~15% mais escuro, sem captura ao vivo equivalente na LM; validar contraste visualmente antes de assumir que basta).
- **Marinho (header/marca):** `--color-lm-marinho #102739` (Verificado, cor do elemento `[class*="primary"]`/header em `leroymerlin.com.br`) — candidato a fundo do header/sidebar dos painéis, substituindo `aco-900`.
- **Cinza neutro:** `--color-lm-cinza #EEEEF0` (Verificado, fundo dominante observado na home da LM por área renderizada) — substitui parte do papel de `aco-100`/superfícies claras.
- **Amarelo (destaque de preço/etiqueta):** `--color-lm-amarelo #F8CC1C` (Verificado, extração ao vivo).
- **Vermelho (alerta/promoção):** `--color-lm-vermelho #B42A27` (Verificado, extração ao vivo).
- **Ink/superfícies/semânticas:** mantidos os mesmos valores neutros da identidade anterior (`ink #121212`, `ink-2 #374151`, `muted #7C7C7C`, `surface #FFFFFF`, `line #E5E7EB`, `ok #16A34A`, `warn #D97706`, `erro #DC2626`, `info #2563EB`) — a troca de paleta é sobre a cor de marca/ação, não sobre os tokens funcionais neutros.
- **Sem tom verde na paleta final** — se aparecer `green-*`/verde em componente novo, é sinal de que a substituição não foi aplicada, não uma cor válida.

**Nota de consistência do documento:** seções abaixo escritas antes de 2026-07-29 ainda citam `aco-*`/`sinal*`/`verde-24h` como se fossem os tokens atuais (ex.: Card de Produto, Galeria, header/nav, Feedback de carrinho) — são registro histórico de como cada componente estava até esta troca. Cada uma será atualizada com o token `lm-*` correspondente conforme o componente for tocado nas fases de implementação (não reescrito em massa aqui, para não misturar "o que já mudou" com "o que ainda vai mudar").

### Paleta legada "Aço & Sinal" (OFICIAL 2026-07-16 a 2026-07-29) — NÃO usar em código novo
`--color-aco-900 #0f1a24` · `--color-aco-800 #1b2a38` · `--color-aco-600 #1e5a8a` (reaproveitado como `lm-azul`, ver acima) · `--color-aco-100 #e3eef6` · `--color-sinal #e8590c` · `--color-sinal-escuro #c74a08` · `--color-verde-24h #15803d` / `--color-verde-24h-tint #dcfce7`. Foi a identidade oficial confirmada pelo dono em 2026-07-19, substituída pela paleta Leroy Merlin em 2026-07-29 (decisão do dono, ver `## Decisões`).

### Paleta legada anterior (roxo/laranja/amarelo) — NÃO usar em código novo
Roxo 800 `#4C1D95` · Roxo 900 `#3F1C72` · Roxo 100 `#F3E8FF` · Laranja `#F04E23` · Amarelo `#E2AF00` · Teal `#2BC1A8`. Era a paleta herdada do site Bubble (decisão 07/07, revista em 16/07, substituída novamente em 29/07). Um mockup externo (`industria24h_novo_layout_vitrine.html`, 18/07) usa esta paleta: aproveitar dele apenas estrutura/features, nunca as cores.

## Tipografia
**Decisão vigente (2026-07-16, "Aço & Sinal"): Archivo 600–800 no display, Inter no resto.**
Confirmado em `globals.css` e `layout.tsx`: `--font-display` aponta para
`var(--font-archivo)` (fallback Inter); `--font-sans` e `--font-data` seguem
`var(--font-inter)`. A decisão de 09/07 (Inter único) foi superada em 16/07
pelo redesign Aço & Sinal, que deu voz industrial aos títulos com Archivo.
(Histórico: 07/07 tentou Cabinet Grotesk/Instrument Sans/Geist; 09/07 reverteu
para Inter único por fidelidade ao Bubble; 16/07 Archivo entrou no display como
parte da identidade nova aprovada pelo dono.)

- **Display/títulos:** Archivo 600–800 via classe `font-display`.
- **Corpo/UI:** Inter 400–700.
- **Preços/dados/tabelas:** Inter com `font-variant-numeric: tabular-nums`, via classe utilitária `num` (`globals.css`). Todo valor `R$` e coluna numérica usa essa classe.
- **Código:** JetBrains Mono (só telas técnicas/admin, herdado do plano original — não confirmado em uso).
- **Escala:** 12 (caption/kicker) · 13-14 (tabela/UI) · 16 (corpo) · 19 (h3) · 22-28 (h2, ver `TituloSecao` em `ui.tsx`: `text-[22px] sm:text-[28px]`) · 44-52 (hero). Kickers uppercase, `tracking-[.12em]`, cor sinal (ver `TituloSecao`).

**⚠️ Nota (design-loop):** o `SYSTEM` prompt embutido em
`tools/design-loop/graph.ts` e `build-graph.ts` ainda descreve `font-display`
como "Cabinet Grotesk"/"Instrument Sans" — desatualizado duas gerações
(Inter único em 07-09, Archivo em 07-16). Funcionalmente inofensivo (a classe
resolve via `globals.css`), mas atualizar na próxima vez que alguém mexer no
design-loop.

## Espaçamento
- **Base:** 4px.
- **Densidade:** confortável na vitrine; compacta nos painéis.
- **Escala:** 2xs(2) xs(4) sm(8) md(16) lg(24) xl(32) 2xl(48) 3xl(64).

## Layout
- **Abordagem:** híbrida — grid disciplinado nos painéis (sidebar 170-240px fixa); editorial na vitrine (banner full-bleed, seções tituladas com `TituloSecao`).
- **Max width:** 1280px (`mx-auto max-w-[1280px]`, confirmado em `VitrineHeader`/`VitrineFooter`).
- **Border radius:** `--radius-sm: 4px` (botões, tags, inputs) · `--radius-md: 8px` (cards). Nada de `rounded-full` fora de avatar/foto/logo — regra aplicada pelo validador determinístico (`validar.ts` linha 40-46).
- **Cards de produto:** foto-primeiro (`aspect-square`, `object-cover`), nome 2 linhas (`line-clamp-2 min-h-[2.5em]`), preço `num` 18px bold, metadado 11px muted. Hover: `border-aco-600` + sombra `shadow-[0_4px_16px_rgba(30,90,138,.12)]`, foto com leve zoom (`scale-[1.03]`).

## Moção
- **Abordagem:** mínima-funcional. Transições observadas no código real: `duration-150` (borda/sombra de hover de card), `duration-200 ease-out` (zoom de foto no hover).
- **Easing:** enter ease-out · exit ease-in · move ease-in-out.
- **Duração:** micro 50-100ms · curta 150-250ms. Nada acima de 400ms. Sem animação de scroll.

## Regras anti-slop
Estas regras são aplicadas por um **validador determinístico**
(`tools/design-loop/validar.ts` e `build-graph.ts`), não apenas documentadas —
uma reescrita que as viole é rejeitada automaticamente e corrigida em loop
(MAX_ITER=3):

- Permitidas só as classes de cor da paleta `lm-*` (azul, azul-escuro, marinho, cinza, amarelo, vermelho) mais os neutros/semânticos (`ink`, `ink-2`, `muted`, `surface`, `line`, `ok`, `warn`, `erro`, `info`). Qualquer `bg-`/`text-`/`border-`/`ring-`/`from-`/`to-`/`divide-` fora dessa lista é bloqueado — inclusive `roxo-*`/`laranja*`/`amarelo` (legado antigo), `aco-*`/`sinal*`/`verde-24h*` (legado Aço & Sinal) e qualquer `green-*`/verde novo (a troca de 2026-07-29 foi propositalmente verde→azul; verde reaparecendo é regressão, não cor válida).
- Proibido `bg-gradient-to-*` (gradiente decorativo).
- `rounded-full` só em elemento com "avatar", "foto" ou "logo" no nome/linha — resto usa no máximo `rounded-lg` (8px).
- Todo valor monetário (`R$`) precisa da classe utilitária `num`.
- Status sempre como tag retangular (`rounded`, 4px), par fundo-claro/texto-escuro (ex.: `bg-aco-100 text-aco-600`, componente `Tag` em `ui.tsx`).
- Preço nunca em fonte proporcional (sempre `num`).
- Famílias permitidas: Archivo (display) e Inter (resto) — não introduzir Roboto/Poppins/system genérico como substituto.
- Guarda de integridade (rewrites): todo `export` do arquivo original precisa sobreviver; `"use client"` não pode sumir; tamanho do arquivo não pode variar mais que 0.5x–2.2x (evita reescritas que na verdade reinventam o arquivo).

## Card de Produto — hierarquia e estados
Baseado no código real de `src/components/vitrine/ui.tsx`:

- **`ProdutoCard`** (padrão): foto → nome (2 linhas, trunca) → preço `num` 18px bold → tag opcional "pedido mín. X un" quando `quantidade_minima > 1`. Sem foto → placeholder cinza `#F3F4F6` com texto "sem imagem".
- **`ProdutoDescontoCard`** (desconto progressivo): mesma estrutura, mas preço vira par — menor preço da faixa em destaque + preço base riscado (`line-through text-muted`) — e tag "desconto progressivo" (`bg-sinal/10 text-sinal-escuro`).
- **`LojaCard`**: avatar circular (logo real ou inicial do nome sobre fundo aco-600), nome + localização, tags opcionais "retirada na loja" / "mín. R$ X" quando aplicável.
- **`Tag`**: componente único reutilizado em todos os cards — `rounded-sm bg-aco-100 px-2 py-0.5 text-[11px] font-medium text-aco-600`.

## Galeria de produto (padrão 2026-07-17) — ✅ implementado
**Observado no Mercado Livre:** miniaturas clicáveis (radio group) — clicar troca
a imagem principal sem reload, sem sair da página.

**Implementado em 2026-07-17:** `src/components/vitrine/GaleriaProduto.tsx`
(client component, `useState` para índice da imagem selecionada), usado em
`produto/[id]/page.tsx` no lugar do grid estático anterior. Recebe exatamente
as mesmas `produto_imagens` já buscadas — zero mudança de schema. Miniatura
ativa: borda `border-aco-600` 2px; demais: `border-[#E5E7EB]`. Sem imagens:
mantém o estado "Sem foto". Todas as fotos (inclusive a que está em destaque)
aparecem como miniatura clicável, não só as demais — permite voltar para a
primeira foto depois de trocar.

## Navegação por categorias — mega-menu (avaliação 2026-07-17)
**Observado no Mercado Livre** (`mercadolivre.com.br`, menu "Categorias" no
header): estrutura de **2 níveis** — lista de categorias de topo (23 itens
observados: Ferramentas, Construção, Indústria e Comércio, Para seu Negócio,
Tecnologia, entre outras) que, ao passar o mouse/clicar, abre um flyout com
sub-categorias agrupadas por bloco temático (ex.: "Tecnologia" expande em
Celulares e Telefones / Informática / Câmeras e Acessórios / Eletrônicos Áudio
e Vídeo / Games / Televisores).

**Hoje no Industria24h:** não existe mega-menu — a navegação por categoria não
foi auditada como implementada na vitrine atual (schema já tem `categorias`/
`subcategorias`, usado hoje só como filtro potencial, ver seção seguinte).

**Proposta schema-safe:** um componente `MegaMenuCategorias` (client, dialog/
popover ao clicar em "Categorias" no `VitrineHeader`) que lista `categorias`
existentes como coluna da esquerda e, ao selecionar uma, mostra suas
`subcategorias` como links agrupados — usa exatamente as tabelas já
confirmadas em `docs/database.md`, nenhuma coluna nova. **Não confirmado:**
se o catálogo atual da Amazônia tem profundidade de subcategoria suficiente
para um flyout de 2 níveis parecer cheio (isso é decisão de produto/conteúdo,
não de código).

## Navegação do header — categorias/ofertas/venda futura (avaliação 2026-07-28)
**Observado em referência externa** (`fresh-harvest-reserve.lovable.app`, protótipo
temático do próprio Industria24h): header com logo à esquerda + menu horizontal
"Categorias / Ofertas / Supermercado / Venda Futura" + badge numérico no ícone do
carrinho; footer em 4 colunas (Navegação, Para Vendedores, Contato, Copyright);
tira de 4 blocos de confiança abaixo do hero ("Pagamento Seguro", "Atendimento" etc.)
— mesma família do `TrustBar` que já existe aqui.

**Hoje no Industria24h:** `VitrineHeader` já tem badge de carrinho (`bg-sinal`) e
`TrustBar` na home. Não há item de menu dedicado a "Venda Futura"/Mercado Futuro no
header principal — a feature existe (ver `industria24h-fidelidade-venda-futura` nos
docs do projeto) mas não está exposta como link de primeiro nível na navegação.

**✅ Implementado em 2026-07-28:** "Ofertas" e "Venda Futura" adicionados como
links no menu horizontal do `VitrineHeader` (`web/src/components/vitrine/ui.tsx`),
`text-white/80` com hover `text-white` (mesma família visual do header `aco-900`,
sem cor fora da paleta). Nenhuma das duas tinha rota própria de comprador — em vez
de inventar página nova, os links apontam para âncoras na home já existentes:
`/#ofertas` (seção `produtosComDesconto`, condicional e sem mock) e
`/#mercado-futuro` (seção `MercadoFuturo`, já real). `scroll-mt-24` adicionado às
duas seções para compensar o header sticky. Zero schema novo, zero dado mockado.

**Painel admin — sidebar:** a referência não expõe um painel admin equivalente
(é só a vitrine do comprador), então não há comparação direta para
`web/src/components/admin/Sidebar.tsx`/`AdminShell` nesta rodada — mantido como
está até uma auditoria com fonte de referência de dashboard.

## Auditoria mobile — comparação com app Mercado Livre (2026-07-28)
Referência: screen recording do app Android nativo do Mercado Livre (392×850),
**não é industria24.com.br** — usado só como benchmark de padrões de UX mobile,
mesma lógica já aplicada nas auditorias de 07-17. 5 áreas auditadas em paralelo.

### Tab bar inferior mobile
**Observado na referência:** ícone de carrinho exibe badge de contagem sempre
visível; 5º slot da navegação primária é "Mais", um hub genérico.

**Hoje no Industria24h:** `src/components/vitrine/TabBarMobile.tsx` já
implementa 5 itens (Início / Buscar / Carrinho / Afiliados / Conta), item ativo
em `text-sinal`, `bg-aco-900` — já conforme identidade, sem azul do ML.
Carrinho **não** exibe badge de contagem (ícone estático). "Afiliados" ocupa o
5º slot, função de nicho competindo com "Categorias", ausente da tab bar.

**Proposta schema-safe:**
- Badge de contagem no item Carrinho: círculo pequeno `bg-sinal text-white`,
  `text-[9px]`, sobre o ícone. Fonte do count: hook/contexto de carrinho
  existente (`CarrinhoProvider`, localStorage) — confirmar o hook exato antes
  de implementar.
- **[PENDENTE DECISÃO DO DONO]** trocar "Afiliados" por "Categorias" no 5º
  slot — mudança de prioridade de navegação, decisão de produto.

### Header mobile / busca
**Observado na referência:** busca visual por foto e sino de notificação com
badge; chips de categoria roláveis horizontalmente acima da listagem.

**Hoje no Industria24h:** `CampoBusca` (form GET `/busca`, texto + lupa) já
usado em `VitrineHeader` desktop e mobile, `bg-aco-900`, sticky, tokens
corretos — nenhuma mudança necessária no campo em si. Sem busca por imagem,
sem notificações (nenhuma das duas tem schema/endpoint hoje). Sem chips de
categoria horizontais, só o dropdown do mega-menu.

**Proposta schema-safe:**
- Chips de categoria horizontais acima da listagem: viável reaproveitando as
  categorias já buscadas por `MegaMenuCategorias.tsx` (ler o componente antes
  de confirmar viabilidade exata), chip ativo `border-b-2 border-sinal
  text-ink`, sem azul do ML.
- **[PENDENTE DECISÃO DO DONO]** notificação para comprador (exige tabela
  nova) e busca visual por foto (feature de produto nova) — ambas sem base em
  dado existente, não propor implementação.

### Card de produto no grid mobile
**Observado na referência:** selo de frete/entrega no card; percentual de
desconto explícito ao lado do preço riscado; badge "mais vendido" e timer de
oferta relâmpago.

**Hoje no Industria24h:** `ProdutoCard` (linha 212) e `ProdutoDescontoCard`
(linha 252) em `web/src/components/vitrine/ui.tsx` já cobrem preço riscado +
pill de desconto progressivo, mas sem "-X%" explícito. `Entrega24hBadge`
(linha 356) já existe e usa dado real (cidade/estado da loja) mas **não está
plugado em nenhum card do grid** — é o gap mais barato e valioso encontrado
nesta auditoria. Sem contagem de vendas nem janela de oferta no schema.

**Proposta schema-safe:**
- Renderizar `<Entrega24hBadge cidade={} estado={} />` dentro de `ProdutoCard`
  e `ProdutoDescontoCard` — exige passar `cidade`/`estado` da loja como prop
  adicional; checar call sites antes de mudar a tipagem `Produto`.
- Adicionar badge "-X% OFF" em `ProdutoDescontoCard`, cálculo inline
  (`Math.round((1 - menorPreco/valor) * 100)`), `bg-sinal/10
  text-sinal-escuro rounded-sm` — mesmo padrão da pill de desconto
  progressivo já existente.
- **[PENDENTE DECISÃO DO DONO]** badge "mais vendido" (exige coluna de
  contagem/ranking de vendas, ausente de `docs/database.md`) e timer de
  oferta relâmpago (exige campo de janela/prazo, ausente do schema) — não
  implementar sem confirmar a fonte do dado.

### Página/componente de carrinho mobile
**Observado na referência:** resumo de total + CTA "Continuar" fixo no
rodapé durante a rolagem; endereço de entrega visível no topo; cross-sell de
produtos relacionados.

**Hoje no Industria24h:** `carrinho.tsx` já tem `CarrinhoProvider`
(localStorage), restrito a uma loja por vez com alerta de conflito, e
`CarrinhoBadge` no header. Em `carrinho/page.tsx`, o bloco de total (linhas
160-173) e o botão "Fechar pedido" (linha 201) rolam soltos junto do
conteúdo, em vez de fixos no rodapé. Sem campo de endereço no carrinho
(coletado no checkout) nem motor de recomendação para cross-sell.

**Proposta schema-safe:**
- Tornar o bloco de total + "Fechar pedido" sticky no mobile: envolver em
  `<div className="sticky bottom-0 border-t border-line bg-white p-3
  md:static md:border-0 md:p-0">`, mesmos tokens já usados (`sinal`,
  `sinal-escuro`, `num`, `rounded-sm`). Puro reposicionamento CSS, zero dado
  novo.
- **[PENDENTE DECISÃO DO DONO]** endereço no topo do carrinho (exige captura
  de endereço pré-checkout, não existe hoje) e cross-sell (exige motor de
  recomendação, não existe hoje).

### Filtros/chips de categoria em listagem mobile
**Observado na referência:** categorias como faixa de chips horizontal (1
toque), chip ativo sinalizado visualmente, navegação entre categorias irmãs
sem sair da listagem.

**Hoje no Industria24h:** `busca/page.tsx` (linhas 116-194) usa `<select
name="categoria_id">` num form GET Server Component sem JS — exige 2 toques e
não sinaliza a categoria ativa. `categoria/[id]/page.tsx` (linhas 57-64, 98)
não tem chips, só recebe `?sub=` do mega-menu — sem forma de trocar de
categoria sem voltar ao header.

**Proposta schema-safe:**
- Em `busca/page.tsx`: trocar o `<select>` por lista horizontal
  `overflow-x-auto` de `<button type="submit" name="categoria_id"
  value={cat.id}>` dentro do mesmo form GET (múltiplos submit buttons
  nativos, sem JS client), reusando a query `categorias` já existente.
  `rounded-lg` (nunca `rounded-full`, fora de avatar), ativo `bg-aco-600
  text-white`, inativo `border border-line text-ink-2`.
- Em `categoria/[id]/page.tsx`: mesma técnica para chips de subcategoria via
  `?sub=`.
- **[PENDENTE DECISÃO DO DONO]** confirmar se a tabela `subcategorias` está
  documentada em `docs/database.md` — não vista nesta auditoria; sem isso
  não dá para buscar a lista em `categoria/[id]/page.tsx`. Chips de
  categorias irmãs (trocar categoria sem passar pelo mega-menu) é
  schema-safe, mas é decisão de UX nova, não só troca visual.

### Resumo de arquivos a tocar
| Área | Arquivo | Tipo de mudança | Status |
|---|---|---|---|
| Tab bar | `src/components/vitrine/TabBarMobile.tsx`, `src/app/layout.tsx` | Badge de contagem no item Carrinho (`useCarrinho()` real); `TabBarMobile` movida para dentro de `CarrinhoProvider` | ✅ implementado — branch local `feat/tabbar-badge-carrinho`, commit `07130ba`, sem push |
| Header/busca | `web/src/components/vitrine/MegaMenuCategorias.tsx` | Chips horizontais — não iniciado | pendente |
| Card produto | `ui.tsx` (`ProdutoCard`, `ProdutoDescontoCard`), `page.tsx`, `loja/[id]/page.tsx`, `categoria/[id]/page.tsx`, `busca/page.tsx` | `Entrega24hBadge` plugado (props `lojaCidade`/`lojaEstado`, com query nova de cidade/estado nos 2 arquivos que não tinham); badge "-X% OFF" | ✅ implementado — branch local `feat/cards-entrega-desconto-badge`, commit `c25c1c6`, sem push |
| Carrinho | `web/src/app/carrinho/page.tsx` | Total+CTA em container sticky mobile, desktop preservado | ✅ implementado — branch local `feat/carrinho-sticky-mobile`, commit `ca1ed51`, sem push |
| Filtros | `web/src/app/busca/page.tsx` | `<select>` de categoria → chips horizontais, form GET sem JS preservado | ✅ implementado — branch local `feat/busca-chips-categoria`, commit `9c488e3`, sem push |
| Filtros | `web/src/app/categoria/[id]/page.tsx` | Chips de subcategoria | [PENDENTE DECISÃO DO DONO] tabela `subcategorias` não confirmada nesta rodada |

**Todas as 4 branches acima são locais, cada uma isolada num worktree próprio, sem push e sem merge entre si.** Precisam ser revisadas e integradas (rebase/merge numa branch única ou 4 PRs separados) antes de ir para produção.

### Mercado Futuro mobile — mockup próprio (não é referência externa)
Recebido mockup mobile de tela dedicada de Mercado Futuro (comprador): seletor
horizontal de datas ("10 Jan · 2000un", "15 Jan · 1500un", "20 Jan · 800un —
Esgotando") + grid de produtos com preço riscado, "preço futuro" em destaque,
data de entrega, estoque. **Paleta do mockup é a legada (roxo/vermelho) — não
usar; aproveitar só estrutura**, mesmo caso já registrado nesta tabela para
`industria24h_novo_layout_vitrine.html` (decisão do dono 18-19/07).

**Confirmado no schema real (não em doc, no código de produção):** tabela
`vendas_futuras` (`id, produto_id, previsao, estoque, valor`) já suporta N
linhas por produto com `previsao` (data) diferente cada uma — exatamente a
estrutura do mockup. Já em uso na home (`web/src/app/page.tsx`,
`itensMercadoFuturo`, seção `#mercado-futuro`): agrupa por `previsao` para as
abas de data, soma `estoque` por data. Componente `MercadoFuturo.tsx` já
recebe `previsao/estoque/valor/preco_base` por item.

**Gap real:** hoje é uma seção da home, não uma página dedicada com o seletor
de data como elemento de primeiro nível (o mockup sugere tela própria, mais
parecida com uma categoria/listagem que só o Mercado Futuro).

**[PENDENTE DECISÃO DO DONO]:** (1) virar página dedicada (`/mercado-futuro`)
em vez de seção da home — decisão de arquitetura de navegação, não só visual;
(2) badge "Esgotando" do mockup — não há lógica de threshold de estoque baixo
no código atual, seria regra de negócio nova (ex: `estoque < X`), não uma
mudança de schema.

### Página de produto mobile — pendente de auditoria
Segunda referência do app Mercado Livre (tela de detalhe de produto, não
listagem) mostra: contador "N vendidos" abaixo do título, carrossel de fotos
com indicador "1/4", ícone de favoritar (coração), botões flutuantes de
vídeo/WhatsApp/compartilhar sobre a imagem, badge de cashback ("meli+").
**Não auditado ainda contra `web/src/app/produto/[id]/page.tsx`** — "N
vendidos" esbarra na mesma ausência de contagem de vendas já sinalizada acima
(schema não confirma essa coluna). Fica para uma rodada de auditoria
dedicada.

## Pesquisa avançada (filtros) — ✅ parcialmente implementado
Ver `docs/redesign-vitrine-navegacao-ml-2026-07-17.md` seção 2 para o detalhamento original. Estado real após 2026-07-17:

- **Implementado em `busca/page.tsx`:** filtro por categoria (`produtos.categoria_id`), faixa de preço mín./máx. (`produtos.valor`), "retirada na loja" (`lojas_vitrine.permite_retirada_na_loja`, join manual em memória — mesmo padrão de `src/app/page.tsx`), e ordenação (mais recentes / menor preço / maior preço). Form GET simples (`action="/busca"`), Server Component, sem JS de cliente.
- **Filtros só aparecem com um termo de busca digitado** — decisão de escopo: a página `busca` continua sendo "resultados de busca refinados por filtro", não um browse por categoria sem texto (isso já existe em `categoria/[id]/page.tsx`).
- **[PENDENTE DECISÃO DO DONO]:** filtros técnicos por atributo (marca, voltagem, potência) exigem tabela nova (`produto_atributos` EAV ou colunas por categoria) — não inventar sem confirmar; filtro por %desconto não se aplica hoje (só existe desconto progressivo por quantidade). Subcategoria (`produtos.subcategoria_id`, tabela `subcategorias` confirmada em `database.types.ts`) não entrou no filtro ainda — próximo incremento óbvio.

## Comportamento de produtos (cards e listagem)
Ver `docs/redesign-vitrine-navegacao-ml-2026-07-17.md` seção 3 para o detalhamento original.

**Correção importante (achado ao implementar, 2026-07-17):** a afirmação
anterior de que só `produto/[id]/page.tsx` tratava indisponibilidade regional
estava errada. `src/app/page.tsx` (home) e `categoria/[id]/page.tsx` já
escondiam completamente produto/loja fora de cobertura via `cobreLoja`/
`lojaCobreCep`, decisão já registrada em comentário de código como "2026-07-14".
Só `produto/[id]/page.tsx` usa o padrão "mostra mas desabilita o botão"
(`foraDaCobertura`). `busca/page.tsx` era o único ponto sem filtro nenhum de
CEP — **corrigido em 2026-07-17** aplicando a mesma regra de esconder já usada
em home/categoria, por consistência com a decisão de 07-14 já em produção.
Deliberadamente **não** introduzimos o padrão "mostra grayed out" do Mercado
Livre nas 3 telas — isso contradiria a decisão de 07-14 sem confirmação do
dono. Migrar de "esconder" para "mostrar desabilitado" (mais parecido com o
que a página de produto já faz) é uma mudança de UX a decidir separadamente.

- Tag de "estoque baixo" no card (`estoque_atual` vs `quantidade_minima`) — **ainda não implementada**, fica para o próximo incremento.
- **[PENDENTE DECISÃO DO DONO — mudança de modelo de dados, não de card]:** "outra opção de compra" (competição de catálogo multi-vendedor por ficha) e nota/avaliação de produto não existem no schema atual; parcelamento depende do gateway (Asaas) e do checkout, fora do escopo de vitrine.

## Confiança do vendedor
**Hoje implementado** (`seller/reputacao/page.tsx`): 3 indicadores calculados
sobre pedidos reais da loja — cancelamento (limite 1,5%), reclamação (limite
2%), envio incorreto (limite 10%) — exibidos como `KpiCard` simples, **sem**
cor/selo/tier e **sem** gate de 10 vendas ou janela de 365 dias.

**Observado no Mercado Livre** (auditoria `docs/auditoria-ml-seller-panel-2026-07-17.md`):
sistema de reputação por cor (vermelho→verde), com gate de 10 vendas e janela
móvel de 365 dias sobre os mesmos 3 tipos de métrica negativa.

**Proposta (ainda não implementada, ver `docs/prd/programa-confianca-inicial-vendedor.md`):**
badge de cor no perfil da loja/card de produto refletindo o mesmo cálculo já
rodando em `seller/reputacao`, com gate de volume mínimo antes de exibir
qualquer selo (evita punir loja nova por amostra pequena). Cor do badge usa
os tokens semânticos existentes (`ok`/`warn`/`erro`), nunca um verde/vermelho
fora da paleta.

## Barra de garantias
**[PROPOSTA — não encontrada implementada em nenhum componente auditado nesta
sessão; conteúdo original deste arquivo (se existia) foi perdido junto com o
arquivo.]** Padrão comum de marketplace B2B a considerar: faixa horizontal
abaixo do preço/CTA na página de produto com 2-3 selos de confiança (ex.:
prazo de entrega, política de troca, suporte via WhatsApp — este último já
existe como CTA em `produto/[id]/page.tsx`). Usar ícone + texto curto, tags
retangulares (não círculo), cor neutra (`ink-2`/`muted`) com no máximo um
destaque em `teal`. **Antes de implementar:** confirmar com o dono quais
garantias são reais e ativas hoje — não inventar política de troca/garantia
que não existe operacionalmente.

## Feedback de carrinho
Baseado no código real de `src/components/carrinho/carrinho.tsx`:

- Carrinho é **restrito a uma loja por vez** (produção Bubble nunca teve pedido multi-vendedor). Tentar adicionar item de outra loja não falha silenciosamente — abre alerta (`role="alert"`, `border-warn bg-warn/10`) com duas ações: "Esvaziar e adicionar este" (sinal) ou "Manter carrinho" (outline).
- Stepper de quantidade com alvos de toque de 40px (`h-10 w-10`) — número puro é difícil de ajustar no celular.
- Confirmação inline após adicionar: modo completo mostra `role="status"` "Adicionado. Ver carrinho" (`text-ok` + link sublinhado); modo compacto (barra fixa mobile) mostra só "Adicionado ✓" no próprio botão, sem texto extra — o badge do carrinho no header já confirma.
- Badge do carrinho no header: contador em `bg-sinal` (texto branco) sobre o link "Carrinho".
- Estoque máximo (`estoqueMaximo`) trava o stepper e desabilita o botão com "Sem estoque" quando `maximo < minimo`.

## Decisões
| Data | Decisão | Racional |
|------|---------|----------|
| 2026-07-07 | Sistema v1 criado (base compartilhada com `web/DESIGN.md`) | `/design-consultation`: pesquisa ML/Leroy/Alibaba/Grainger/ME + extração da paleta real do site Bubble |
| 2026-07-07 | Paleta herdada do site atual (roxo/laranja/amarelo/teal) | Decisão do usuário: 158 usuários reais conhecem a marca; banners preservados |
| 2026-07-09 | Reversão para Inter único em toda a tipografia (display/sans/dados) | Fidelidade 100% à marca real do site em produção — tentativa de dar voz tipográfica própria (Cabinet Grotesk/Instrument Sans/Geist) foi revertida especificamente em `web-transportadoras`. Confirmado via comentário em `globals.css` linha 40; texto exato da decisão original não recuperado (arquivo perdido) |
| 2026-07-14 | Card de Produto — hierarquia e estados documentados | Auditoria do código real de `ui.tsx` (`ProdutoCard`/`ProdutoDescontoCard`/`LojaCard`) |
| 2026-07-17 | Galeria de produto proposta como interativa (miniaturas clicáveis); estado "indisponível na sua região" proposto também no card de listagem | Engenharia reversa autenticada do painel/produto real do Mercado Livre, ver `docs/auditoria-ml-seller-panel-2026-07-17.md` e `docs/redesign-vitrine-navegacao-ml-2026-07-17.md`. Mantida a decisão de fidelidade de marca de 09/07 — mudança é de interação/comportamento, não de cor/tipografia |
| 2026-07-17 | Reescrita completa deste arquivo após ele ter sido encontrado ausente do checkout | Arquivo não existia mais em `web-transportadoras/` (só `AGENTS.md`/`CLAUDE.md`/`README.md`); ambas as ferramentas do design-loop dependem dele via `readFileSync` e estavam quebradas. Reconstruído a partir de código real, não de memória — decisões anteriores a 07-14 têm racional reconstruído, não citação literal |
| 2026-07-17 | Mega-menu de categorias (2 níveis) e pesquisa avançada por filtros adotados como padrão-alvo, com itens marcados **[PENDENTE DECISÃO DO DONO]** onde exigem schema novo | Engenharia reversa da navegação/busca real do Mercado Livre (home + `lista.mercadolivre.com.br`); cruzado com `docs/database.md` para não inventar coluna/tabela |
| 2026-07-17 | **Implementado**: `GaleriaProduto.tsx` (client, extraído de `produto/[id]/page.tsx`) substitui o grid estático — miniaturas clicáveis, todas as fotos navegáveis | Código escrito e revisado nesta sessão; não foi possível rodar `tsc`/build (sandbox sem shell) — recomenda-se rodar `npm run build` antes do deploy |
| 2026-07-17 | **Implementado**: filtros de `busca/page.tsx` (categoria, preço mín./máx., retirada na loja, ordenação) + correção do gap de cobertura por CEP na busca (antes não filtrava por região nenhuma; agora usa a mesma regra de "esconder" já em produção em home/categoria) | Achado ao implementar: a home e a página de categoria já escondiam produto fora de cobertura desde 2026-07-14 — só a busca não tinha esse filtro. Optou-se por igualar a busca ao padrão existente (esconder) em vez de inventar um padrão novo "mostrar desabilitado" sem confirmar com o dono |
| 2026-07-17 | Mega-menu de categorias e tag de "estoque baixo" no card **não implementados** nesta rodada | Escopo desta sessão priorizou os itens sem decisão pendente e de menor risco (galeria, filtros de busca); mega-menu exige tocar `VitrineHeader` (todas as páginas) e mereceu ficar para uma sessão dedicada |
| 2026-07-28 | Avaliada referência externa `fresh-harvest-reserve.lovable.app` para navegação do header (itens "Ofertas"/"Venda Futura", footer 4 colunas); **paleta e tipografia não alteradas** — Aço & Sinal permanece única identidade oficial (decisão do dono 07-19). Proposta de itens de menu fica pendente de confirmação | `/design-consultation` em modo evolução — comparar padrões estruturais contra referência sem herdar cor/fonte de fora |
| 2026-07-28 | **Implementado**: links "Ofertas" e "Venda Futura" no `VitrineHeader` mobile/desktop, ancorando em `/#ofertas` e `/#mercado-futuro` (seções reais já existentes na home, sem rota nova, sem mock) | Nenhuma das duas features tinha página de comprador dedicada; em vez de inventar rota, aproveitou-se seções condicionais já buscando dado real |
| 2026-07-28 | Auditoria mobile de 5 áreas (tab bar, header/busca, card de produto, carrinho, filtros de categoria) contra o app nativo do Mercado Livre, via workflow de agentes em paralelo | Achado principal: maior parte do padrão ML já implementado corretamente com tokens Aço & Sinal (tab bar, busca); gap real e barato identificado é plugar `Entrega24hBadge` (já existe) nos cards do grid, que hoje não o renderizam |
| 2026-07-19 | **"Aço & Sinal" confirmada pelo dono como identidade OFICIAL e única** (vitrine + painéis); este arquivo corrigido — versão de 07-17 descrevia roxo como primária, contradizendo o código em produção (PRs #44/#46/#51/#53) | Duas sessões paralelas divergiram (uma publicou Aço & Sinal, outra reconstruiu este doc com base em `globals.css` que ainda carrega os tokens legados). Dono decidiu explicitamente em 19/07: Aço & Sinal fica; mockup roxo só como referência de features. Na mesma correção, convertidos os últimos resquícios de roxo/laranja/amarelo em `carrinho.tsx`, `checkout/page.tsx` e `busca/page.tsx` |
| 2026-07-28 | **Implementado**: galerias de banner editáveis no admin (`vitrine_galerias`/`vitrine_galeria_produtos`, migration `0092`, aplicada em produção) — tipos `lancamento`/`mais_baratos`/`desconto_progressivo` calculados dinamicamente pela aplicação, `custom` curado manualmente pelo admin; todos os tipos calculados filtrados por `lojaCobreCep()` para manter produtos de CEPs próximos em destaque | Pedido do dono: galeria com rolagem lateral (reaproveitado `BannerGalerias.tsx`/`GaleriaCarrossel`) + regra de negócio explícita de priorizar proximidade de CEP. CRUD admin em `feat/admin-galerias` (commit `b562b6e`), componente público em `feat/galerias-vitrine-publico` (commit `0a44fd5`) — ambos não mesclados/pushados ainda |
| 2026-07-29 | **Troca de paleta "Aço & Sinal" → "Leroy Merlin"** (`aco-*`/`sinal*`/`verde-24h*` → `lm-azul`/`lm-azul-escuro`/`lm-marinho`/`lm-cinza`/`lm-amarelo`/`lm-vermelho`), com correção verde→azul: a LM usa verde como CTA, mas o dono pediu azul (reaproveitado de `aco-600 #1E5A8A`) em todo lugar que seria verde | Decisão explícita do dono na mesma sessão do redesign PDP/carrinho multi-loja. Cores da LM extraídas ao vivo via `getComputedStyle` em `leroymerlin.com.br` (2026-07-29) — não copiadas de memória/treino. Escopo: brainstorm + plano em `.claude/plans/https-industria24-com-br-admin-https-ind-eventual-horizon.md` |

---

**Recomendação de próximo passo:** rodar `git log --diff-filter=D -- DESIGN.md`
(ou equivalente) no terminal local para confirmar quando/como este arquivo
sumiu — isso não foi possível nesta sessão por falta de acesso a shell.
