# Design System — Indústria 24h (vitrine `web-transportadoras`)

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

## Cor (herdada da marca no ar — industria24h.com.br)
Tokens reais, confirmados em `src/app/globals.css` (`@theme inline`):

- **Primária (header/nav/identidade):** Roxo 800 `#4C1D95` · Roxo 900 `#3F1C72` (nav secundária/sidebar) · Roxo 100 `#F3E8FF` (fundo de tag/hover claro) · Roxo 200 `#DDD3F0`
- **CTA/ação:** Laranja `#F04E23` · Laranja escuro `#D83E16` (hover)
- **Destaque:** Amarelo `#E2AF00` (badge do carrinho, item ativo na sidebar)
- **Apoio/ilustração:** Teal `#2BC1A8` (nunca texto sobre branco)
- **Ink:** `#121212` texto · `#374151` secundário (ink-2) · `#7C7C7C` muted
- **Superfícies:** fundo `#FAFAF9` · cards `#FFFFFF` (surface) · borda `#E5E7EB` (line)
- **Semânticas:** sucesso `#16A34A` (ok) · alerta `#D97706` (warn) · erro `#DC2626` (erro) · info `#2563EB`
- **Banners:** banners reais do site atual, em `public/banners/` (banner-principal.png, banner-mercado-futuro.png, banner-3.jpg + variantes mobile).
- **Dark mode:** ainda não implementado no código auditado (nenhuma classe `dark:` encontrada em `ui.tsx`/`globals.css`) — se for implementado, seguir a mesma proporção de contraste: fundo `#171420`, card `#211D2E`, borda `#3B3450`, roxo vira acento claro `#C4B5FD` em texto, semânticas com saturação -15%. Tratar como especificação em espera, não como algo já no ar.

## Tipografia
**Decisão vigente (2026-07-09): Inter único, 100% fidelidade ao site real.**
Confirmado em `globals.css`: `--font-display`, `--font-sans` e `--font-data` apontam
todos para `var(--font-inter)`. Isso reverteu uma tentativa anterior (registrada em
`web/DESIGN.md`, 2026-07-07) de dar identidade tipográfica própria ao rebuild
(Cabinet Grotesk + Instrument Sans + Geist) — o dono decidiu que a base viva
(158 usuários reais na Bubble) já reconhece a marca com Inter, e trocar a fonte
seria mudança de identidade visual não pedida.

- **Tudo:** Inter 400–700, incluindo títulos (`font-display` = Inter aqui, não Cabinet Grotesk — ver nota abaixo sobre inconsistência).
- **Preços/dados/tabelas:** Inter com `font-variant-numeric: tabular-nums`, via classe utilitária `num` (`globals.css` linha 52-56). Todo valor `R$` e coluna numérica usa essa classe.
- **Código:** JetBrains Mono (só telas técnicas/admin, herdado do plano original — não confirmado em uso).
- **Escala:** 12 (caption/kicker) · 13-14 (tabela/UI) · 16 (corpo) · 19 (h3) · 22-28 (h2, ver `TituloSecao` em `ui.tsx`: `text-[22px] sm:text-[28px]`) · 44-52 (hero). Kickers uppercase, `tracking-[.12em]`, cor laranja (ver `TituloSecao`).

**⚠️ Inconsistência encontrada e não corrigida nesta sessão:** o `SYSTEM` prompt
embutido em `tools/design-loop/graph.ts` (linha 50-52) e em `build-graph.ts`
(linha 61-65) ainda descreve `font-display` como "Cabinet Grotesk" e cita
"Instrument Sans" como padrão do body — texto copiado do `web/DESIGN.md`
original e nunca atualizado após a reversão de 07-09. Funcionalmente inofensivo
(a classe `font-display` resolve para Inter de qualquer forma via `globals.css`),
mas o comentário/instrução que o LLM do design-loop lê está desatualizado e
pode confundir gerações futuras que mencionem "Cabinet Grotesk" no código por
engano. Recomendação: atualizar esses dois textos `SYSTEM` na próxima vez que
alguém mexer no design-loop.

## Espaçamento
- **Base:** 4px.
- **Densidade:** confortável na vitrine; compacta nos painéis.
- **Escala:** 2xs(2) xs(4) sm(8) md(16) lg(24) xl(32) 2xl(48) 3xl(64).

## Layout
- **Abordagem:** híbrida — grid disciplinado nos painéis (sidebar 170-240px fixa); editorial na vitrine (banner full-bleed, seções tituladas com `TituloSecao`).
- **Max width:** 1280px (`mx-auto max-w-[1280px]`, confirmado em `VitrineHeader`/`VitrineFooter`).
- **Border radius:** `--radius-sm: 4px` (botões, tags, inputs) · `--radius-md: 8px` (cards). Nada de `rounded-full` fora de avatar/foto/logo — regra aplicada pelo validador determinístico (`validar.ts` linha 40-46).
- **Cards de produto:** foto-primeiro (`aspect-square`, `object-cover`), nome 2 linhas (`line-clamp-2 min-h-[2.5em]`), preço `num` 18px bold, metadado 11px muted. Hover: `border-roxo-800` + sombra `shadow-[0_4px_16px_rgba(76,29,149,.10)]`, foto com leve zoom (`scale-[1.03]`).

## Moção
- **Abordagem:** mínima-funcional. Transições observadas no código real: `duration-150` (borda/sombra de hover de card), `duration-200 ease-out` (zoom de foto no hover).
- **Easing:** enter ease-out · exit ease-in · move ease-in-out.
- **Duração:** micro 50-100ms · curta 150-250ms. Nada acima de 400ms. Sem animação de scroll.

## Regras anti-slop
Estas regras são aplicadas por um **validador determinístico**
(`tools/design-loop/validar.ts` e `build-graph.ts`), não apenas documentadas —
uma reescrita que as viole é rejeitada automaticamente e corrigida em loop
(MAX_ITER=3):

- Proibidas classes de cor fora da paleta: `blue`, `indigo`, `purple`, `violet`, `fuchsia`, `pink`, `sky`, `cyan` em qualquer `bg-`/`text-`/`border-`/`ring-`/`from-`/`to-`/`divide-`. Use só os tokens da marca.
- Proibido `bg-gradient-to-*` (gradiente decorativo).
- `rounded-full` só em elemento com "avatar", "foto" ou "logo" no nome/linha — resto usa no máximo `rounded-lg` (8px).
- Todo valor monetário (`R$`) precisa da classe utilitária `num`.
- Status sempre como tag retangular (`rounded`, 4px), par fundo-claro/texto-escuro (ex.: `bg-roxo-100 text-roxo-800`, componente `Tag` em `ui.tsx`).
- Preço nunca em fonte proporcional (sempre `num`).
- Inter como única família — não introduzir Roboto/Poppins/system genérico como substituto.
- Guarda de integridade (rewrites): todo `export` do arquivo original precisa sobreviver; `"use client"` não pode sumir; tamanho do arquivo não pode variar mais que 0.5x–2.2x (evita reescritas que na verdade reinventam o arquivo).

## Card de Produto — hierarquia e estados
Baseado no código real de `src/components/vitrine/ui.tsx`:

- **`ProdutoCard`** (padrão): foto → nome (2 linhas, trunca) → preço `num` 18px bold → tag opcional "pedido mín. X un" quando `quantidade_minima > 1`. Sem foto → placeholder cinza `#F3F4F6` com texto "sem imagem".
- **`ProdutoDescontoCard`** (desconto progressivo): mesma estrutura, mas preço vira par — menor preço da faixa em destaque + preço base riscado (`line-through text-muted`) — e tag amarela clara "desconto progressivo" (`bg-amarelo/10`).
- **`LojaCard`**: avatar circular (logo real ou inicial do nome sobre fundo roxo-800), nome + localização, tags opcionais "retirada na loja" / "mín. R$ X" quando aplicável.
- **`Tag`**: componente único reutilizado em todos os cards — `rounded-sm bg-roxo-100 px-2 py-0.5 text-[11px] font-medium text-roxo-800`.

## Galeria de produto (padrão 2026-07-17) — ✅ implementado
**Observado no Mercado Livre:** miniaturas clicáveis (radio group) — clicar troca
a imagem principal sem reload, sem sair da página.

**Implementado em 2026-07-17:** `src/components/vitrine/GaleriaProduto.tsx`
(client component, `useState` para índice da imagem selecionada), usado em
`produto/[id]/page.tsx` no lugar do grid estático anterior. Recebe exatamente
as mesmas `produto_imagens` já buscadas — zero mudança de schema. Miniatura
ativa: borda `border-roxo-800` 2px; demais: `border-[#E5E7EB]`. Sem imagens:
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

- Carrinho é **restrito a uma loja por vez** (produção Bubble nunca teve pedido multi-vendedor). Tentar adicionar item de outra loja não falha silenciosamente — abre alerta (`role="alert"`, `border-warn bg-warn/10`) com duas ações: "Esvaziar e adicionar este" (laranja) ou "Manter carrinho" (outline).
- Stepper de quantidade com alvos de toque de 40px (`h-10 w-10`) — número puro é difícil de ajustar no celular.
- Confirmação inline após adicionar: modo completo mostra `role="status"` "Adicionado. Ver carrinho" (`text-ok` + link sublinhado); modo compacto (barra fixa mobile) mostra só "Adicionado ✓" no próprio botão, sem texto extra — o badge do carrinho no header já confirma.
- Badge do carrinho no header: contador em `bg-amarelo` sobre o link "Carrinho".
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

---

**Recomendação de próximo passo:** rodar `git log --diff-filter=D -- DESIGN.md`
(ou equivalente) no terminal local para confirmar quando/como este arquivo
sumiu — isso não foi possível nesta sessão por falta de acesso a shell.
