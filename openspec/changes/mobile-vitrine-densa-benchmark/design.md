## Contexto

Benchmark: app Android do **Zé Delivery**, gravação da dona em 11/09/2026 (`Downloads\redesign-mobile-navegacao_UX.mp4`, 392×850, 1min40). Transcrição local (faster-whisper, `small`, pt) — a chave do Whisper da OpenAI estava sem crédito. Frames analisados: 16, por mudança de cena.

Referências de estado atual: `DESIGN.md` (refresh de 11/09, PR #604), memória da navegação mobile em produção (PRs #573/#575/#579/#582/#584).

## Brainstorm: o que a dona comentou, o que o vídeo mostra, o que fazemos

| t | Comentário (narração) | O que o Zé faz | Estado na Indústria 24h | Decisão |
|---|---|---|---|---|
| 00:06 | "os produtos estão pequenos, [com] um quadrado ao redor" | foto contida num quadrado verde-claro, cantos 12px | foto `object-cover` sangrando no card | **Adotar:** quadrado `lm-cinza`, `object-contain`, raio 10px (refresh) |
| 00:11 | "consigo ter as galerias de banners" | carrossel de banners com indicador de página | `BannerGalerias` já existe | **Manter**, só conferir indicador |
| 00:14 | "ofertas também em um card e … a rolagem" | bloco amarelo com 2 produtos, cronômetro e "Ir para Ofertas" | seção de ofertas solta | **Adotar** o container; cronômetro só com `validade` real |
| 00:19 | "o formato do texto, do preço, como eu adiciono ao carrinho" | preço 16px bold, riscado + "−35%", "+" sobre a foto | preço 20px, "+" abaixo do nome | **Adotar** "+" sobre a foto; cor **azul**, não amarelo (ver risco 1) |
| 00:25 | "como eu busco, os menus de baixo, as campanhas" | busca no topo, tab bar de 5, chips de campanha | busca no header, tab bar de 4 | **Propor** tab bar de 5 — decisão do dono |
| 00:34 / 00:42 | "descontos progressivos … as quantidades" | "Leve + por −", "R$ 36,07 /un. 3un", "1 un. R$ 48,09", "−25%" | `ProdutoDescontoCard` mostra só "com desconto progressivo" | **Adotar:** regra da faixa escrita no card |
| 00:48 | "consigo ir para a home, tenho as categorias" | chip "Categorias" fixo abre bottom sheet em grade | categorias em aba da tab bar | **Adotar** chip + bottom sheet |
| 01:00 | "rodar a tela com muito mais produtos" | 2,3–2,5 cards por trilho, muitos trilhos empilhados | 2 cards por trilho (`w-[45%]`) | **Adotar** 40% (2,5 cards) |
| 01:17 | "menus embaixo: o pedido, o histórico, o refazer, os cupons" | abas Cupons e Pedidos; "refazer" no histórico | Pedidos na tab bar; `/cupons` existe; sem "refazer" | **Adotar** "Comprar de novo"; Cupons na tab bar é decisão do dono |
| 01:31 | "se eu coloco o código de entrega em algum lugar" | código fixo por usuário no perfil, 4 dígitos | `pedidos.codigo_retirada`, por pedido, só na página do pedido | **Adotar** exibir o código dos pedidos pagos em andamento no topo da conta e de Pedidos; **não** criar código por usuário |

## Decisões de design

1. **Densidade por largura, não por encolher texto.** O ganho de 2 → 2,5 cards vem de `w-[40%]` e de padding 10px no corpo do card; o nome continua 13px e o preço 16px. Encolher a fonte abaixo disso fere legibilidade no público B2B (mercadinhos, obras) que compra em pé, com uma mão.
2. **Quadrado claro atrás da foto.** `lm-cinza` com `object-contain` e 8px de respiro: foto de fornecedor da Amazônia chega em fundos e proporções variados; o quadrado uniformiza a grade sem recortar o produto (hoje `object-cover` corta rótulo de garrafa e ponta de vergalhão).
3. **"+" sobre a foto, em azul.** Posição do Zé (canto inferior direito da foto, 36px visuais com área de toque de 44px). Cor `lm-azul`: o refresh de 11/09 reservou o amarelo para a etiqueta "Preço de fábrica" e proibiu amarelo como fundo de botão — copiar o amarelo do Zé quebraria a regra aprovada dois PRs atrás.
4. **Desconto progressivo legível.** Linha 1: menor preço da faixa + "/un. a partir de N un". Linha 2: "1 un. R$ X" riscado + pílula "−Y%" em `lm-vermelho/10` com texto `lm-vermelho` (promoção, conforme DESIGN.md). Dados de `promocoes_progressivas.faixas`, já lidos na página do produto.
5. **Chips fixos.** Faixa `sticky` logo abaixo do header, `createPortal` para o bottom sheet (armadilha do stacking context `sticky z-40`, ver memória de nav mobile). Primeiro chip "Categorias" com ícone de grade; demais chips = categorias que têm produto para o CEP.
6. **Código de entrega.** Um cartão "Seu código de entrega" com os dígitos em `num` 24px e `tracking-[.3em]`, só para pedidos pagos e ainda não entregues; vários pedidos = um código por pedido com o nome da loja. Mesmo dado e mesma regra de visibilidade da página do pedido (só após pagamento).

## Decisões da dona (11/09) e ajustes na implementação

- Tab bar de 5 abas, "+" azul, cronômetro só com validade real.
- Pedido extra: reduzir o topo, logo em ícone e busca menor e dinâmica. Implementado como `TopoRecolhivel`: busca e chips recolhem ao rolar para baixo, a linha da marca fica. Isso absorve a US01 do PRD 033 (rascunho sem PR, branch `docs/prd-033-navegacao-mobile-vitrine`); as US02 e US04 dele não foram decididas e ficaram fora.
- Os chips não ficam fixos durante a rolagem, como a spec original previa: recolhem junto com a busca, porque o pedido mais recente da dona foi economizar altura.
- Código de entrega sem o nome da loja: a view `pedidos_cliente` não expõe `loja_id`.
- Economia com cupons fora: `cupom_usos` não guarda o valor descontado.
- Achado: o menor preço da home e das galerias de desconto incluía faixas vencidas; corrigido pela mesma função que alimenta o card.

## Riscos e trade-offs

1. **Amarelo do benchmark.** A dona pode querer o "+" amarelo como no vídeo. Trade-off: fidelidade ao benchmark vs. regra do refresh. Registrado como pergunta no grupo 0 de `tasks.md`.
2. **Tab bar de 5 abas.** Desfaz a decisão de 11/09 (#584), que removeu "Ajuda" por duplicar o FAB. Cinco abas em 360px dão 72px por aba, acima do mínimo de 44px, mas rótulos longos precisam caber ("Carrinho" é o mais longo).
3. **Chips fixos + header + tab bar** consomem ~156 + 52 + 56 px de 800. O ganho de densidade só se realiza se o header encolher ao rolar (o Zé esconde a busca e mantém endereço + chips).
4. **"Comprar de novo"** com produto sem estoque, fora da faixa de CEP ou de loja diferente da do carrinho atual: o carrinho já é restrito a uma loja por vez e já trata conflito; itens indisponíveis entram como aviso, não em silêncio.
