<!-- PRD: docs/prds/038-ruptura-de-estoque-e-alertas-ao-seller.md -->

## Why

Medido no banco de produção (`tiwdqgyeyvceaiqqwitc`) em 16/09/2026:

- 115 produtos `Aprovado`, **50 deles com `estoque_atual <= 0` e todos visíveis**
  na home, busca, categoria, loja, cross-sell, galerias e feed. Nenhuma dessas
  consultas filtra estoque, só `status_produto = 'Aprovado'`.
- **46 desses 50 têm venda futura ativa** (`vendas_futuras.estoque > 0`), ou
  seja, são vendáveis por reserva. Esconder "todo produto sem estoque" tiraria
  46 produtos vendáveis do ar.
- O carrinho vive em `localStorage` e **nunca é revalidado** contra o banco.
- A única barreira real é a RPC `checkout_criar_pedido`, que levanta
  `Estoque insuficiente de "%" (disponível: %)` já na tela de pagamento.

O incidente de 16/09 (print `estoque-indisponivel.jpg`) é exatamente isso: o
comprador montou R$ 105,00 de carrinho e só na forma de pagamento descobriu que
"Bloco 14 milheiro" tinha 0 unidades. Esse produto tem **7 ofertas de venda
futura ativas** — era vendável o tempo todo, pela porta errada.

Do lado do seller, 43% do catálogo parou de vender sem que ele fosse avisado: o
painel tem um contador "sem estoque" no sidebar, mas nenhum alerta, nenhum
e-mail, e nenhum aviso na tela do próprio produto.

## What Changes

- **View `produtos_vendaveis`** como fonte única de "o que pode aparecer na
  vitrine": produto `Aprovado`, de loja `Ativa`, com `valor > 0` e com
  `estoque_atual > 0` **ou** oferta de venda futura ativa. Todas as listagens
  públicas passam a ler dessa view em vez de `produtos`. Uma regra, um lugar —
  em vez de repetir o filtro em 12 consultas e esquecer na décima terceira.
- **PDP continua acessível** para produto em ruptura (SEO e links
  compartilhados), com o estado explícito: indisponível, ou reserva com
  previsão quando há venda futura.
- **Carrinho revalidado no servidor** ao abrir o carrinho e ao entrar no
  checkout: item indisponível fica marcado, fora do total, e o botão de
  finalizar trava enquanto houver pendência. Item com venda futura mostra a
  reserva como alternativa.
- **Painel do seller separa esgotado de crítico**: hoje um contador só
  (`lte estoque_atual 0`) mistura "parou de vender" com "vai parar". Passa a
  haver filtro na lista, cor por estado, e a indicação de se o produto está
  fora da vitrine ou vendendo por reserva.
- **Resumo diário de ruptura por e-mail** ao seller, um por loja, via cron
  diário (o plano Vercel atual não permite cron horário) reaproveitando
  `src/lib/email.ts` e o padrão de `/api/carrinho/abandono/tick`.
- **Avisos de reserva por WhatsApp** (BubbleWhats) ao comprador e ao seller,
  às vésperas da data combinada e no próprio dia. A venda futura era vendida e
  sumia do radar: o comprador só via a data no e-mail do pedido e o seller não
  era lembrado de separar a mercadoria.

### Não faz parte desta change

- Ledger de movimentação, reserva com expiração e estoque por local: é a change
  `estoque-ledger-milestone1` (PRD 036). Aqui nada muda no modelo de saldo.
- Trava nova no checkout. A RPC já barra; esta change move o aviso para antes.
- Alerta por WhatsApp e reposição sugerida.

## Impact

- **Banco**: duas migrations aditivas. `0173` cria as views
  `produtos_vendaveis` e `produtos_em_ruptura` (`security_barrier`,
  `grant select` para `anon, authenticated`) e um índice parcial em
  `vendas_futuras`; `0174` cria `alertas_enviados`, a tabela de idempotência
  dos cron (RLS ligada, sem policy — só service role). Nenhuma tabela, coluna
  ou RPC existente alterada; reversível com `drop view` / `drop table`.
- **Catálogo público**: `src/lib/catalogo-compra/*`, `src/app/busca`,
  `src/app/categoria`, `src/app/loja`, `src/app/feed-produtos.xml`,
  `src/app/api/busca-preview`, `src/app/carrinho/actions.ts`.
- **Compra**: `src/app/produto/[id]/page.tsx`, `src/app/carrinho/page.tsx`,
  `src/app/checkout`.
- **Seller**: `src/app/(seller)/seller/produtos`, `seller/page.tsx`,
  `seller/layout.tsx`, `src/components/seller/ProdutoLinha.tsx`.
- **Cron**: nova rota `/api/estoque/alerta/tick` + entrada em `vercel.json`.
- **Efeito imediato em produção**: 4 produtos saem da vitrine (sem saldo e sem
  reserva); 46 permanecem, agora identificados como reserva.
