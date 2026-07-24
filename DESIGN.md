# Design System — Indústria 24h

> **Reescrito 2026-07-22.** Fonte da paleta: protótipo real em Lovable,
> `https://fresh-harvest-reserve.lovable.app` (módulo Mercado Futuro),
> enviado e confirmado pela dona (Andreia) como identidade visual oficial.
> Cores extraídas ao vivo via `getComputedStyle` nesse protótipo. Estrutura de
> navegação e interação seguem o reverse-engineering do Mercado Livre
> (mercadolivre.com.br, 19/07 e 22/07). Este arquivo substitui três sistemas
> de cor testados no mesmo dia (Aço & Sinal → paleta Mercado Livre → tentativa
> de azul) — o histórico completo de cada decisão e por que foi trocada está
> na tabela de Decisões, no fim deste arquivo. Este documento cobre a
> *aparência e a interação*; migrar o código real (`tailwind.config`,
> `globals.css`, classes `aco-*`/`sinal`/`ml-*`) é trabalho de implementação
> separado, ainda não feito.

## Contexto do Produto
- **O que é:** marketplace B2B destinado a indústrias — venda direta do fabricante, grandes volumes e venda no mercado futuro. Loja grátis, plataforma retém 5% por item.
- **Para quem:** indústrias e produtores que vendem direto (sellers) e compradores de volume (mercadinhos, restaurantes, construtoras, revendas). 3 superfícies: vitrine do comprador, painel do seller, painel admin. **Três modos de compra:** pronta-entrega, grandes volumes com desconto progressivo, e mercado futuro (reserva de produção/safra com data de disponibilidade e quantidade mínima).
- **Categoria/pares pesquisados:** Mercado Livre, Leroy Merlin, Alibaba, Grainger, Mercado Eletrônico (07/07); aprofundado em Mercado Livre (navegação, galeria, busca, produto, painel de vendedor, banners, carregamento) em 17/07, 19/07 e 22/07. Identidade visual (cor/tipografia/forma) fonte: protótipo Lovable do Mercado Futuro (22/07).
- **Tipo:** web app (marketplace + 2 painéis), com camada mobile-first tipo "app" (tab bar fixa).

## Direção Estética
- **Direção:** Marketplace popular de alto volume — vitrine densa, preço e promoção sempre protagonistas, navegação por abas fixas no mobile (padrão de interação Mercado Livre).
- **Decoração:** roxo de identidade no chrome e nos estados ativos/selecionados; vermelho reservado a ação e urgência (CTA, desconto). Intencional e mínima — sem gradiente decorativo, sem blob.
- **Mood:** "loja popular confiável e rápida", com o verde reservado especificamente ao preço em oferta — não a frete ou status genérico.

## Cor — OFICIAL "Vermelho & Roxo"
Fonte de verdade: `https://fresh-harvest-reserve.lovable.app`, tokens extraídos ao
vivo via `getComputedStyle` em 2026-07-22 — os nomes de classe reais do protótipo
(`bg-primary`, `text-primary-foreground`) confirmam o papel de cada cor:

- **`roxo-primary` `#3F1B7E`** — cor de chrome/identidade e de **estado ativo/selecionado**: barra utilitária de localização, categoria/chip ativo, data selecionada, item ativo de navegação, avatar de loja.
- **`vermelho-cta` `#E42535`** — cor de **ação**: CTA primário ("Reservar", "Adicionar ao carrinho", "Comprar"), badge de desconto percentual, badge "NOVO"/"OFERTA". Confirmado em 17 ocorrências reais no protótipo (botões "Reservar"/"Reservar Agora" e badges de desconto) — é o token com maior confiança de todo o sistema.
- **`verde-preco` `#21C45D`** — cor do **preço final em destaque** quando há desconto/oferta (rótulo "Preço futuro:" no protótipo). Não usar para frete, sucesso de sistema ou qualquer coisa fora do próprio valor do preço.
- **Preço riscado ("de"):** `#6B7280`, `line-through`, 12px.
- **Ink:** `#0F1729` texto principal · `#6B7280` secundário/muted.
- **Semânticas de sistema (não são cor de marca):** erro `red-700 #bf000f` sobre `red-50 #fef2f2` · alerta `yellow-800 #874b00` sobre `yellow-100 #fef9c2` · sucesso `green-800 #016630` sobre `green-100 #dcfce7`. Usadas em toasts/status — `vermelho-cta` e `verde-preco` nunca as substituem.
- **Superfícies:** fundo `#FAFAF9` · cards `#FFFFFF` (surface) · borda `#E5E7EB` (line).
- **Tokens aposentados (histórico — não usar em código novo):** `aco-*`, `sinal`/`sinal-escuro` (Aço & Sinal), `ml-amarelo`/`ml-azul`/`ml-verde` (paleta Mercado Livre testada pela manhã), `azul-header` (tentativa que nunca chegou a código), `roxo-*` do Bubble legado (`#4C1D95` — **não confundir** com o `roxo-primary` novo `#3F1B7E`, são tokens diferentes de fontes diferentes). Ver tabela de Decisões para o histórico completo.

## Tipografia
- **Display/títulos:** **Sora** 600–700 — confirmado nos H1/H2 reais do protótipo Lovable (`getComputedStyle` retornou `"Sora, system-ui, sans-serif"`).
- **Corpo/UI:** Inter 400–700.
- **Preços/dados/tabelas:** Inter com `font-variant-numeric: tabular-nums`, classe utilitária `num`. Todo valor `R$` e coluna numérica usa essa classe.
- **Código:** JetBrains Mono (só telas técnicas/admin).
- **Escala:** 12 (caption/kicker) · 13-14 (tabela/UI) · 16 (corpo) · 19 (h3) · 22-28 (h2) · 44-52 (hero, confirmado 44px no H1 do protótipo). Kickers uppercase, `tracking-[.12em]`, cor `roxo-primary`.
- **Proibidas:** Proxima Nova (licenciada pelo Mercado Livre/Adobe Fonts, não disponível), Roboto e Poppins como família de corpo (ver ritmo Renner abaixo — copiamos o comportamento, não a fonte).

### Ritmo tipográfico — padrão Lojas Renner
Auditado no CSS ao vivo de lojasrenner.com.br: Roboto 400, nav 12px, tracking
0.48px (≈0.04em). O que faz aquele visual funcionar é o *ritmo* — peso leve,
corpo pequeno, tracking generoso — não a família em si. Importamos o ritmo com
Sora/Inter:

- **Nav / menu de categorias:** 12-13px, peso **400** (nunca 600+), `tracking-[0.04em]`.
- **Títulos de seção:** caixa alta, peso 500-600, `tracking-[0.08em]`, tamanho contido (14-16px).
- **Faixa utilitária de benefícios** (frete grátis / parcelamento / cupons): 12px, peso 400, ícone 16px alinhado à baseline.
- **Preço é a exceção:** `num` bold, sem tracking extra — o único elemento que quebra o ritmo leve.

## Ícones
**Lucide** (`lucide-react`) — confirmado no protótipo real (classes `lucide lucide-*`
no DOM), mesma biblioteca já usada em componentes React do projeto. Mapeamento
confirmado por uso real no protótipo:

- **Header/nav:** `Menu` (hambúrguer mobile) · `Search` (busca) · `User` (conta) · `ShoppingCart` (carrinho) · `MapPin` (localização/CEP).
- **Faixa de confiança:** `CreditCard` (Pagamento Seguro) · `Headphones` (Atendimento Rápido) · `ShieldCheck` (Dados Seguros) · `Truck` (Frete Rápido) — 20-28px, cor `roxo-primary`.
- **Categorias do mercado futuro:** `Leaf` (Folhosas) · `Carrot` (Legumes) · `Cherry` (Frutas) · `Wheat` (Grãos) — 16px, dentro do pill de categoria.
- **Diversos:** `Check` (confirmação) · `Calendar` (chips de data, 14-16px) · `ArrowRight` (CTAs secundários "Ver mais").

## Logo
- **Arquivo real:** `public/logo-industria24h.png` (enviado pela dona, aplicado no mockup mobile `docs/prototypes/mockup-mobile-100-css-2026-07-22.html` em 2026-07-23). Ícone: carrinho de compras branco sobre quadrado `rounded-2xl` `roxo-primary`; wordmark "Indústria" em `roxo-primary` + "24h" em `vermelho-cta`, peso 800 (bate com a escala Sora do sistema).
- **Uso:** header principal (~28px de altura no mobile), favicon/PWA icon (gerar variações quadradas a partir do ícone isolado). Usar sempre o arquivo real — não recriar como ícone Lucide + texto genérico.

## Espaçamento
- **Base:** 4px.
- **Densidade:** confortável na vitrine; compacta nos painéis.
- **Escala:** 2xs(2) xs(4) sm(8) md(16) lg(24) xl(32) 2xl(48) 3xl(64).

## Layout e forma
- **Abordagem:** híbrida — grid disciplinado nos painéis (sidebar 170-240px fixa); editorial na vitrine (banner full-bleed, seções tituladas com `TituloSecao`); **mobile é "app-like"** — tab bar fixa no rodapé, conteúdo em grid 2 colunas.
- **Max width:** 1280px (`mx-auto max-w-[1280px]`) no desktop.
- **Border radius:** `rounded-full` (9999px) é o **padrão para botões, badges e chips** — confirmado no protótipo real (Reservar, categoria ativa, badge de desconto). Cards de data: `rounded-xl` (12px), `border-2` ao redor (não só embaixo), `padding` 12px, `min-width` 90px. **Cards de produto: `rounded-2xl` (16px)** — confirmado na classe real `card-product` do protótipo (maior que o `radius-md` 8px usado até então nos painéis/telas técnicas, que continua valendo só ali).
- **Cards de produto:** foto-primeiro (`aspect-square`, `object-cover`), nome 2 linhas (`line-clamp-2`), preço `num` 18px bold, metadado 11px muted. Borda sutil `0.8px solid rgba(229,231,235,.5)`, sem sombra em repouso (confirmado no protótipo — nada de `shadow-md` default). Hover: `border-roxo-primary` + leve zoom na foto (`scale-[1.03]`, `duration-200 ease-out`).
- **Botões CTA (`vermelho-cta`):** sombra suave colorida sob o botão (`box-shadow` com a cor do próprio botão a ~40% opacidade, deslocamento 4px, blur 20px) — dá sensação de "elevado", confirmado no botão "Reservar" real do protótipo. Não usar sombra genérica cinza nesses botões.

## Navegação mobile — Tab Bar fixa
Mobile é tratado como **app web**: barra de abas fixa no rodapé, sempre visível,
nunca soma no scroll (diferente do header, que pode colapsar). Padrão de
interação do app Mercado Livre. Levantamento completo em
`docs/redesign-mobile-app-ml-2026-07-22.md`.

- **5 abas**, ícone + rótulo 10-11px, altura ~56-64px, sombra sutil para cima: **Início** (`/`) · **Categorias** (mega-menu / `/categoria/[id]`) · **Carrinho** (`/carrinho`, badge numérico `vermelho-cta`) · **Ofertas** (mercado futuro + descontos progressivos — hoje só existe como âncora na home, rota dedicada `[PENDENTE DECISÃO DO DONO]`) · **Mais** (drawer: Vender no 24h, Venda como Afiliado, Entrar/Sair, CEP — "Meus Pedidos"/"Meu Perfil" do comprador **ainda não têm página no rebuild**, só existem no Bubble legado; portar essa área é pré-requisito de engenharia antes da aba abrir algo completo).
- Aba ativa em `roxo-primary`, inativas em `#6B7280`.
- Badge do carrinho reaproveita a lógica de contagem já existente (`carrinho.tsx`), só troca a cor.

## Regras anti-slop
- Cor de marca é sempre o token nomeado: `roxo-primary` / `vermelho-cta` / `verde-preco`, nunca classe genérica do Tailwind (`purple-*`, `red-500`, `green-500` crus).
- Proibidos os tokens aposentados em código novo: `aco-*`, `sinal`/`sinal-escuro`, `ml-amarelo`/`ml-azul`/`ml-verde`, `azul-header`, `roxo-*` legado do Bubble (ver seção Cor).
- Fora da paleta de marca e das semânticas documentadas: `violet`, `indigo`, `pink`, `fuchsia`, `sky`, `cyan`, `amber`, `orange` genérico continuam proibidos.
- Proibido `bg-gradient-to-*` (gradiente decorativo).
- `rounded-full` é o padrão para botão/badge/chip (não é mais exceção restrita a avatar/foto/logo).
- Todo valor monetário (`R$`) precisa da classe utilitária `num`.
- Status de sistema (toast, erro genérico) sempre como tag retangular (`rounded`, 4px) com os tokens semânticos — `vermelho-cta`/`verde-preco` não os substituem.
- Famílias permitidas: **Sora** (display) e Inter (resto). Proxima Nova, Roboto e Poppins proibidos como família.

## Header e navegação — mega-menu de categorias
Estrutura de navegação segue o Mercado Livre (reverse-engineering ao vivo,
19/07); cor de chrome segue o protótipo Lovable.

- **Barra principal (fundo `roxo-primary`):** logo Indústria 24h → localização/CEP ("Enviar para [Cidade], [UF]", ícone de pin) → busca full-width (fundo branco, texto "Buscar produtos na indústria…") → carrinho com badge `vermelho-cta`.
- **Mega-menu:** flyout abaixo da barra, fundo branco, borda `#E5E7EB`. Coluna esquerda (~150-200px) lista categorias de topo; categoria em hover/selecionada ganha fundo tint de `roxo-primary` + texto `roxo-primary` + peso 500. Área à direita: grid de 2-3 colunas com subcategorias, agrupadas por bloco temático. Usa as tabelas `categorias`/`subcategorias` já existentes — nenhuma coluna nova.
- **Sub-nav sticky:** abaixo do header, scroll horizontal de categorias em chip `rounded-full`; item ativo com fundo `roxo-primary` (mesmo padrão do protótipo, não underline).
- **Breadcrumb:** obrigatório em categoria, produto e loja (`Home > Categoria > Produto`), 12px `#7C7C7C`, último item em ink sem link.
- **Busca com preview:** dropdown de resultado ao digitar (até 5 produtos, foto + nome + preço), sem modal de tela cheia.

## Banners e primeira dobra
- **Banner hero:** carrossel full-bleed de borda a borda da viewport (`w-screen`, sem margem lateral); o conteúdo interno respeita o container de 1280px. Usa os banners reais já existentes em `public/banners/` — **não trocar as imagens**. Setas circulares translúcidas, dots pequenos, autoplay ~6s com pausa no hover/foco, `prefers-reduced-motion` respeitado. Altura `aspect-[21/9]` desktop, `aspect-[4/3]` mobile.
- **Copy real, usar como referência de tom** (não inventar texto de campanha): "Grandes volumes, descontos progressivos — confira as marcas" (confirmado em `www.industria24h.com.br`) e "Reserve sua Produção com Preço Garantido" / "Compre direto do produtor e receba na data da colheita" (confirmado no protótipo Lovable). Trust bar real, 4 itens: "Pagamento Seguro" / "Atendimento Rápido" / "Dados Seguros" / "Frete Rápido".
- **Banner de galerias:** faixa de cards promocionais em carrossel horizontal, dentro do container 1280px. Card `rounded-md` 8px, `aspect-[16/9]`, título sobreposto (peso 600, branco). Badge opcional `rounded-full` fundo `vermelho-cta` para "NOVO"/"OFERTA". Título da faixa no ritmo Renner com link "Ver todos" em `roxo-primary`. **Fonte de dados a confirmar:** sem tabela de banners em `docs/database.md`, o componente recebe array via props — não inventar tabela.
- **Faixa de confiança:** `TrustBar` logo abaixo do hero, já implementada, tipografia no ritmo Renner (12px, peso 400).

## Carregamento
- **Skeleton, nunca spinner central de tela cheia:** cards de produto mostram placeholder cinza `#F3F4F6` pulsante; texto e preço em barras retangulares do tamanho do conteúdo final (evita layout shift).
- **Troca de categoria/página:** fade + slide-up sutil (150-200ms), nunca flash branco.
- **Scroll infinito de produtos:** skeleton de mais 1 fileira no fim da lista enquanto busca a próxima página.

## Card de Produto — hierarquia e estados
Baseado no código real de `src/components/vitrine/ui.tsx`:

- **`ProdutoCard`** (padrão): foto → nome (2 linhas, trunca) → preço `num` 18px bold → tag opcional "pedido mín. X un" → ícone de carrinho flutuante `vermelho-cta` no canto da foto. Sem foto → placeholder `#F3F4F6` com texto "sem imagem".
- **`ProdutoDescontoCard`** (desconto progressivo — regra de volume do Indústria 24h): preço final em `verde-preco` (confirmado no protótipo: preço com desconto é verde) + preço "de" riscado (`#6B7280`, 12px) ao lado, nunca abaixo — badge pill `vermelho-cta` com o percentual (ex. "-67%"), mesmo padrão do protótipo. **[PENDENTE DECISÃO DO DONO]:** trocar o texto "desconto progressivo" pelo percentual direto, ou manter os dois?
- **Indisponível na região:** estado do card inteiro — opacidade ~55-60%, preço visível mas esmaecido, texto "indisponível na sua região" 10-11px `#6B7280` no lugar do metadado. Nunca CTA de compra ativo. Regra de negócio real (cobertura por CEP) que o Mercado Livre nem tem — preservar.
- **`LojaCard`**: avatar circular (logo real ou inicial sobre fundo `roxo-primary`), nome + localização, tags "retirada na loja"/"mín. R$ X".
- **`Tag`**: componente único — `rounded-full` fundo tint de `roxo-primary`, `px-2.5 py-0.5 text-[11px] font-medium text-roxo-primary`.

## Galeria de produto — ✅ implementado
`src/components/vitrine/GaleriaProduto.tsx`: miniaturas clicáveis (radio group)
trocam a imagem principal sem reload. Miniatura ativa: borda `roxo-primary` 2px;
demais: `#E5E7EB`. Todas as fotos aparecem como miniatura clicável. Sem imagens:
"sem foto". **Pendente (mobile):** gesto de swipe horizontal, hoje só reage a
clique na miniatura.

## ⚠️ Dois domínios no ar — não confundir
| | `industria24h.com.br` (com "h") | `industria24.com.br` (sem "h") |
|---|---|---|
| Paleta hoje no ar | Roxo `#4C1D95`/`#3F1C72`, Amarelo `#E2AF00` (**diferente** do `roxo-primary #3F1B7E` deste sistema — coincidência de família de cor, tokens distintos) | Aço/Sinal (código atual, **a migrar** para Vermelho & Roxo) |
| Fontes | Poppins, Roboto, Barlow, Open Sans (mistura) | Archivo + Inter (código atual, **a migrar** para Sora + Inter) |
| Natureza | **Bubble legado** — não está neste repositório | **Rebuild Next.js — é ESTE repositório** |

**Alvo deste design system: `industria24.com.br` (o rebuild).** O legado roxo do
Bubble não tem código aqui; qualquer mudança nele seria manual no editor Bubble.

## Mercado Futuro (venda futura)
Superfície de reserva de produção/safra — é o módulo do próprio protótipo
Lovable de referência, então tem a maior fidelidade possível:

- **Categorias com contagem:** pills `rounded-full` "Todos" / "Folhosas 24" / "Legumes 18" / "Frutas 32" / "Grãos 12" acima do seletor de datas. Pill ativa: fundo `roxo-primary`, texto branco; inativas: fundo branco, borda `#E5E7EB`.
- **Seletor de datas:** cards `rounded-xl` (12px), data em peso 700, quantidade (`2000 un.`) abaixo. Tag **"Esgotando"** quando estoque baixo. Chip selecionado: fundo `roxo-primary`, texto branco. **Ordenar as datas cronologicamente** (bug de dados conhecido no Bubble legado — corrigir junto).
- **Card de produto futuro:** foto quadrada, nome, nome da loja (ex. "Fazenda Verde", "Sítio Buriti") em 12px `#6B7280`, badge de desconto percentual `vermelho-cta` (pill) no canto da foto.
- **Preço:** preço base riscado (`line-through`, `#6B7280`, 12px, rótulo "R$ X,XX") acima; rótulo "Preço futuro:" + valor em `num` bold 24px na cor `verde-preco`.
- **Metadados da reserva:** "Em: DD/MM/AA" + "Estoque: N.NNN" (separador de milhar), stepper de quantidade antes do botão.
- **CTA "Reservar":** botão `rounded-full`, fundo `vermelho-cta`, texto branco, peso 600/700 — confirmado pixel a pixel no protótipo real, 17 ocorrências.
- **Estado de reserva confirmada:** confirmação inline (`role="status"`, `green-800` sobre `green-100`), sem alert bloqueante.
- **Carregamento:** skeleton de chips + skeleton de cards, nunca spinner.
- **Seção de captação de vendedor:** "Venda direto para o Brasil inteiro" com 3 benefícios (Mais margem / Gestão simples / Alcance nacional) + estatísticas ("+5.000 Produtores cadastrados", "98% Satisfação", "+40% Margem extra") + CTA "Cadastrar minha indústria". **[PENDENTE DECISÃO DO DONO]:** os números são reais ou placeholder de protótipo? Não usar em produção sem confirmar a fonte.

## Página de produto — buy box
Layout 2 colunas no desktop (galeria à esquerda, buy box à direita); **no
mobile, buy box vira barra fixa no rodapé** (acima da tab bar).

- **Preço:** `num` bold 24px, primeiro elemento da buy box.
- **Stepper de quantidade:** botões `−`/`+` de 34-40px (alvo de toque), número central 13px; botão "Adicionar ao carrinho" full-width `rounded-full`, fundo `vermelho-cta`, texto branco.
- **Confirmação inline:** `role="status"` "Adicionado. Ver carrinho", ícone de check, cor `green-800`/`green-100`, link sublinhado — sem alert/confirm bloqueante.
- **Aviso de carrinho multi-loja:** caixa `bg-yellow-100` borda `yellow-800`, aparece quando o carrinho já tem itens de outra loja. Duas ações: "Esvaziar e adicionar este" (`vermelho-cta`, preenchido) e "Manter carrinho" (outline).
- **Barra de garantias:** ícones horizontais compactos (frete, segurança/SSL, WhatsApp) logo abaixo do preço/CTA, sempre acima da dobra.

## Pesquisa avançada (filtros) — ✅ parcialmente implementado
- Filtro por categoria, faixa de preço mín./máx., "retirada na loja", ordenação (recentes/menor preço/maior preço). Form GET simples, Server Component.
- Filtros só aparecem com termo de busca digitado — browse por categoria sem texto continua em `categoria/[id]`.
- **Mobile:** painel de filtros vira bottom sheet (sobe de baixo) em vez do painel lateral fixo.
- **Pendente decisão do dono:** filtros por atributo (marca, voltagem, potência) exigem tabela nova; subcategoria ainda não entrou no filtro.

## Comportamento de produtos (cobertura regional)
- Home e categoria escondem produto/loja fora da cobertura de CEP (`cobreLoja`/`lojaCobreCep`).
- Produto usa "mostra mas desabilita" (estado "indisponível na região" acima). Migrar tudo para esse padrão é decisão de UX separada.
- Tag de "estoque baixo" no card — ainda não implementada (existe como "Esgotando" no protótipo do mercado futuro).

## Confiança do vendedor
- **Implementado:** 3 indicadores sobre pedidos reais (cancelamento ≤1,5%, reclamação ≤2%, envio incorreto ≤10%) como KPI simples, sem selo/tier.
- **Proposta:** badge de cor no perfil/card com gate de volume mínimo, usando os tokens semânticos confirmados.
- **Seções "Veja os produtos de: X":** nota média (estrelas) + tempo médio de entrega, só quando o dado existir no schema — não inventar métrica.

## Feedback de carrinho
- Carrinho restrito a uma loja por vez — ver aviso multi-loja acima.
- Badge do carrinho no header/tab bar: contador `vermelho-cta`, texto branco.
- Ao adicionar item, contador anima (100-150ms) e atualiza sem reload.
- Estoque máximo trava o stepper, desabilita botão com "Sem estoque".

## Checkout mobile — retenção de benefício
Padrão observado no app do Mercado Livre: ao tentar sair do checkout, modal
"Você tem frete grátis. Se sair, perderá esse benefício!" com CTA primário
`vermelho-cta` e secundário outline — retenção via perda de benefício, não
bloqueio. Aplicável a benefícios reais do Indústria 24h (desconto progressivo,
reserva de mercado futuro). **[PENDENTE DECISÃO DO DONO]:** confirmar se faz
sentido para o perfil B2B (tickets maiores) ou se soa forçado fora do contexto
de compra por impulso do varejo do ML.

## O que não replicar sem decisão de produto — [PENDENTE DECISÃO DO DONO]
- **"Outra opção de compra"** (mesmo produto, vendedores diferentes) — não existe conceito de catálogo compartilhado no schema atual.
- **Nota/avaliação do vendedor e contagem de vendas no card** — não existe sistema de avaliação de produto no schema atual.
- **Parcelamento no card** — depende do gateway (Asaas) suportar e do checkout exibir.
- **Área de conta/pedidos do comprador** — só existe hoje para seller/admin (`(seller)/seller/pedidos`, `(admin)/admin/pedidos`); comprador não tem página própria no rebuild. Pré-requisito de engenharia para a aba "Mais" da tab bar funcionar por completo.
- **PWA de verdade** (instalável, ícone na tela inicial, offline) — este documento cobre aparência/interação; manifest/service worker é engenharia separada.
- **Estatísticas da seção de captação de vendedor** (+5.000 produtores, 98% satisfação, +40% margem) — confirmar se são dados reais antes de usar em produção.

## Decisões
| Data | Decisão | Racional |
|------|---------|----------|
| 2026-07-07 | Sistema v1 criado (paleta roxo/laranja/amarelo herdada do Bubble) | `/design-consultation`: pesquisa ML/Leroy/Alibaba/Grainger/ME |
| 2026-07-09 | Tipografia única Inter | Fidelidade 100% à marca real então em produção |
| 2026-07-14 | Card de produto, confiança, garantias, feedback de carrinho documentados | Auditoria UX vs. Mercado Livre/Shopee |
| 2026-07-16 | Identidade **"Aço & Sinal"** adotada e publicada em produção (PRs #44/#46/#51/#53) — roxo/laranja/amarelo descontinuados | Redesign completo pedido pelo dono: cromo neutro (aço) + laranja de ação (sinal) + verde de entrega |
| 2026-07-17 | Galeria de produto interativa implementada; mega-menu e filtros avançados avaliados via engenharia reversa do Mercado Livre | `GaleriaProduto.tsx` shipado; mega-menu ficou como proposta |
| 2026-07-19 (manhã) | Mockup `industria24h_novo_layout_vitrine.html` recebido — decisão inicial: aproveitar só estrutura, nunca a paleta roxo do mockup | Aço & Sinal já em produção e reconhecida pelos usuários |
| 2026-07-19 (revisão intermediária, **revertida**) | Tentativa de reverter para paleta roxo/laranja/amarelo do mockup | Decisão tomada sem checar o CSS de produção; corrigida ao inspecionar `getComputedStyle`/stylesheet reais do site ao vivo |
| 2026-07-19 (final) | Paleta oficial confirmada como Aço & Sinal — logotipo e cor azul mantidos | Reverse-engineering ao vivo de mercadolivre.com.br + inspeção do CSS real de industria24.com.br; dono confirmou manter logo e azul |
| 2026-07-20 | Descoberta dos dois domínios: `industria24h.com.br` é o Bubble legado; `industria24.com.br` (Aço & Sinal) é o rebuild deste repo | Auditoria via `getComputedStyle` nos dois domínios |
| 2026-07-20 | Regressão real encontrada no rebuild: botão "Reservar" do mercado futuro em azul `info` em vez do CTA de marca | Inspeção do CSS computado em produção |
| 2026-07-20 | Ritmo tipográfico da Lojas Renner adotado, mantendo Archivo+Inter | Pedido do dono de "fontes iguais às da Renner"; Roboto conflita com anti-slop, copiou-se o ritmo, não a fonte |
| 2026-07-20 | Banner hero passa a full-bleed; criada a faixa de banner de galerias (padrão "Benefícios em entretenimento" do ML) | Pedido explícito do dono |
| 2026-07-22 (manhã) | Reversão de Aço & Sinal para a paleta visual completa do Mercado Livre (amarelo/azul/verde) — não mais só estrutura, agora cor também. Escopo: mobile-first/app web | Andreia confirmou explicitamente, em resposta ao conflito com a decisão de 19/07; ver `docs/redesign-mobile-app-ml-2026-07-22.md` |
| 2026-07-22 (tarde, início) | Tentativa de trocar chrome de amarelo para um azul aproximado do banner do Bubble legado — **nunca chegou a código** | Andreia pediu "identidade visual atual" + "banners atuais" de `www.industria24h.com.br` |
| **2026-07-22 (tarde, final)** | **Paleta oficial passa a ser "Vermelho & Roxo"**, extraída de um protótipo Lovable real enviado pela dona (`fresh-harvest-reserve.lovable.app`) — `roxo-primary #3F1B7E`, `vermelho-cta #E42535`, `verde-preco #21C45D`. Tipografia de display muda para Sora. Botões/badges/chips passam a `rounded-full` (revoga a regra anti-slop anterior sobre pill) | Andreia enviou o link do protótipo e confirmou explicitamente que é essa a referência de identidade visual oficial, substituindo as tentativas anteriores do mesmo dia |
| 2026-07-23 | **Correção de drift em outras cópias:** `DESIGN.md` raiz, `.claude/skills/` e 25 cópias em `web/.claude/worktrees/*`/`web-worktrees/*` estavam presas na revisão intermediária "Mercado Livre" (Archivo) — regredidas por uma reescrita que não herdou esta decisão final de 22/07. Todas ressincronizadas com esta versão (Vermelho & Roxo / Sora); só `.claude/skills/DESIGN.md` ficou pendente (caminho protegido na sessão) | Andreia reportou "a fonte continua errada" no mockup; investigação encontrou várias cópias divergentes; Andreia confirmou Sora + Vermelho & Roxo e pediu sincronização geral |
| 2026-07-23 | **Logo real aplicado** no mockup mobile: `public/logo-industria24h.png` (carrinho branco sobre `roxo-primary` + wordmark "Indústria24h") substitui o placeholder de ícone Lucide + texto | Andreia enviou o arquivo do logo oficial e pediu aplicação |
| **2026-07-23** | **⚠️ Drift crítico descoberto — não corrigido, aguarda decisão:** o código de produção real (`web/src/app/globals.css`, `web/src/app/layout.tsx`) usa um **4º sistema de tokens**, diferente de qualquer revisão deste DESIGN.md: paleta `roxo-800 #4c1d95` / `laranja #f04e23` / `amarelo #e2af00` / `teal #2bc1a8`, fontes **Cabinet Grotesk** (via Fontshare, títulos) + **Instrument Sans** + **Geist** (via `next/font/google`). Não é Aço & Sinal, não é Mercado Livre, não é Vermelho & Roxo/Sora — nenhuma versão anterior deste arquivo bate com o que está de fato rodando. Nada foi sobrescrito em código de produção | Descoberto ao montar os tokens de código do design system; `globals.css`/`layout.tsx` reais inspecionados diretamente. **[PENDENTE DECISÃO DO DONO]:** confirmar se a migração de `web/src/app/globals.css` para os tokens Vermelho & Roxo/Sora deste documento deve entrar em código agora, e por quem |
