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
- **O que é:** marketplace B2B industrial da Amazônia (Manaus) — comprar direto da indústria/produtor; loja grátis, plataforma retém 5% por item.
- **Para quem:** compradores B2B (mercadinhos, restaurantes, construtoras) e sellers fabricantes/produtores. 3 superfícies: vitrine do comprador, painel do seller, painel admin.
- **Categoria/pares pesquisados originalmente:** Mercado Livre, Leroy Merlin, Alibaba, Grainger, Mercado Eletrônico (2026-07-07). Aprofundado em Mercado Livre (navegação, galeria, busca, produto, painel de vendedor) em 2026-07-17 — ver os dois documentos de auditoria citados acima.
- **Tipo:** web app (marketplace + 2 painéis).

## Direção Estética
- **Direção:** Industrial/Utilitária com dobra editorial — function-first nos painéis; primeira dobra da vitrine composta como pôster, não documento.
- **Decoração:** intencional e mínima. Sem gradiente roxo-decorativo, sem grid de 3 ícones em bolinha, sem blob.
- **Mood:** "ERP bem feito com cara de loja" — confiável, denso onde precisa, preço sempre protagonista.

## Cor — identidade "Aurora Industrial" (OFICIAL desde 2026-07-29, substitui Aço & Sinal)
Fonte: mockup `industria24h-redesign.html` (Downloads, 29/07), aprovado pelo dono
por cima da identidade "Aço & Sinal" (2026-07-16/19) — ver Decisões. **Ainda não
migrada para o código** (`globals.css` continua com os tokens `aco-*`/`sinal`
até a implementação); este documento registra o alvo.

- **Racional:** hero maroon→teal para dar identidade de marca mais quente/humana
  que o cromo neutro anterior; roxo como cor de chrome/navegação; amarelo como
  acento de "trabalhador/24h" (selo do dial, ícones); verde reservado a preço/
  desconto de supermercado.
- **Roxo (chrome/identidade):** `--purple-deep #3B1E5C` (header, catnav escuro) ·
  `--purple-royal #6D3FA6` (catnav, categoria "Venda Futura", CTAs secundários) ·
  `--purple-soft #EFE7F9` (tint de ícone/badge neutro).
  **Nota:** este roxo **não é** o roxo legado do Bubble (`#4C1D95`/`#3F1C72`) —
  tokens novos, não confundir.
  A verificar antes de migrar: qual convenção de classe substitui `text-aco-600`.
- **Sinal de ação:** `--red-signal #E63329` (busca, CTA de badge, desconto) ·
  `--red-soft #FDEAE8` (tint).
- **Amarelo trabalhador (selo 24h/destaque):** `--yellow-worker #FFC72C` — usado
  no dial "24h ABERTO" do hero, ícone/destaque de categoria "Eletrônicos", preço
  parcelado.
- **Hero (maroon→teal, só no banner):** `--maroon-hero #2C0F1B` → `--teal-hero
  #0F3B48`, gradiente diagonal 100deg, exclusivo do `.hero-banner` — não usar
  fora do hero.
- **Verde supermercado/desconto:** `--green-fresh #3E7D34` sobre `--green-soft
  #EAF4E6` (badge "desconto progressivo", preço com % OFF).
- **Ink:** `--ink #1C1424` texto · `--ink-soft #6C6478` secundário.
- **Superfícies:** fundo `--bg-canvas #F6F4FB` · card `--surface #FFFFFF` ·
  borda `--border #E5DFF0`.
- **Radius:** `--radius-s 8px` · `--radius-m 14px` · `--radius-l 22px` (hero,
  banner de assinatura).
- **[PENDENTE DECISÃO DO DONO]:** mapeamento de semânticas de sistema (sucesso/
  alerta/erro/info) não veio do mockup — o `DESIGN.md` anterior tinha
  `#16A34A`/`#D97706`/`#DC2626`/`#2563EB`; manter esses até decisão em contrário,
  já que não fazem parte da identidade visual e sim de estado de sistema.
- **Banners:** o mockup não define fonte de banner — continuar usando
  `public/banners/` reais, sem inventar imagem nova.

### Paleta aposentada (Aço & Sinal, 2026-07-16 a 2026-07-29) — NÃO usar em código novo
`--color-aco-900 #0f1a24` · `--color-aco-800 #1b2a38` · `--color-aco-600 #1e5a8a`
· `--color-aco-100 #e3eef6` · `--color-sinal #e8590c` (+ `-escuro #c74a08`) ·
`--color-verde-24h #15803d` (+ tint `#dcfce7`). Foi a identidade oficial por 13
dias, confirmada pelo dono em 19/07 e publicada em produção (PRs #44/#46/#51/
#53) — superada pela decisão de 29/07 acima. Continua em `globals.css` até a
migração de código acontecer.

### Paleta legada Bubble (roxo antigo/laranja/amarelo antigo/teal antigo) — NÃO usar em código novo
Roxo 800 `#4C1D95` · Roxo 900 `#3F1C72` · Roxo 100 `#F3E8FF` · Laranja `#F04E23`
· Amarelo `#E2AF00` · Teal `#2BC1A8`. Paleta do site Bubble legado
(`industria24h.com.br`, com "h" — domínio diferente deste projeto). Não
confundir com o roxo/amarelo/teal novos de "Aurora Industrial" acima, que são
tokens distintos vindos de fonte diferente (mockup 29/07, não Bubble).

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
(MAX_ITER=3). **[PENDENTE — validar.ts ainda não atualizado para 29/07]:**
o código do validador hoje ainda reflete as regras antigas de "Aço & Sinal"
(bloqueia `purple`/`indigo` e todo `bg-gradient-to-*`, restringe `rounded-full`
a avatar/foto/logo) — a lista abaixo é o **alvo** pós-migração; até o validador
ser atualizado, ele vai rejeitar componentes que usem roxo/gradiente do hero/
`rounded-full` fora de avatar, mesmo já sendo a paleta oficial. Não editar
`validar.ts` sem confirmação explícita — é o guard-rail de qualidade do design-loop.

- Cor de marca sempre pelos tokens nomeados (`purple-royal`, `red-signal`, `yellow-worker`, `green-fresh`) — nunca classe genérica crua do Tailwind.
- Fora da paleta e das semânticas de sistema documentadas: `indigo`, `violet`, `fuchsia`, `pink`, `sky`, `cyan`, `blue` continuam proibidos.
- `bg-gradient-to-*` **permitido exclusivamente** no `.hero-banner` (maroon→teal) — em qualquer outro componente continua proibido.
- `rounded-full` passa a ser padrão também em ícone circular de destaque (dial "24h", setas de carrossel `cat-arrow`/`carousel-nav`, botão de favorito) além de avatar/foto/logo — resto do app usa no máximo `radius-l` (22px).
- Todo valor monetário (`R$`) precisa da classe utilitária `num`.
- Status sempre como tag retangular, par fundo-claro/texto-escuro — regra inalterada.
- Preço nunca em fonte proporcional (sempre `num`).
- Famílias permitidas: Archivo (display) e Inter (resto) — mockup usa a mesma dupla, sem mudança de fonte.
- Guarda de integridade (rewrites): todo `export` do arquivo original precisa sobreviver; `"use client"` não pode sumir; tamanho do arquivo não pode variar mais que 0.5x–2.2x.

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
| 2026-07-19 | **"Aço & Sinal" confirmada pelo dono como identidade OFICIAL e única** (vitrine + painéis); este arquivo corrigido — versão de 07-17 descrevia roxo como primária, contradizendo o código em produção (PRs #44/#46/#51/#53) | Duas sessões paralelas divergiram (uma publicou Aço & Sinal, outra reconstruiu este doc com base em `globals.css` que ainda carrega os tokens legados). Dono decidiu explicitamente em 19/07: Aço & Sinal fica; mockup roxo só como referência de features. Na mesma correção, convertidos os últimos resquícios de roxo/laranja/amarelo em `carrinho.tsx`, `checkout/page.tsx` e `busca/page.tsx` |
| **2026-07-29** | **"Aço & Sinal" descontinuada; nova identidade "Aurora Industrial"** adotada a partir do mockup `industria24h-redesign.html` (Downloads) — roxo `purple-royal`/`purple-deep`, hero gradiente maroon→teal, amarelo `yellow-worker`, verde `green-fresh` para desconto. Categorias corrigidas para o catálogo real (Ofertas, Venda Futura, Supermercado, Eletrônicos, Vestuário, Cestas & Assinaturas) — o mockup inicial trazia categorias de construção/ferramentas copiadas por engano de uma referência Leroy Merlin, removidas por não pertencerem ao catálogo do Indústria24h. **Ainda não migrado para código** (`globals.css`/`validar.ts` seguem com os tokens Aço & Sinal); `validar.ts` não deve ser editado sem confirmação separada, é o guard-rail de qualidade do design-loop | Decisão explícita do dono em 29/07, por cima da identidade anterior — terceira troca de paleta oficial do projeto (roxo/laranja/amarelo Bubble → Aço & Sinal → Aurora Industrial) |

---

**Recomendação de próximo passo:** rodar `git log --diff-filter=D -- DESIGN.md`
(ou equivalente) no terminal local para confirmar quando/como este arquivo
sumiu — isso não foi possível nesta sessão por falta de acesso a shell.
