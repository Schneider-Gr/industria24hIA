---
prd_number: "038"
status: rascunho
priority: crítica
created: 2026-09-16
issue: ""
depends_on: ["011", "012", "036"]
references:
  - "src/lib/catalogo-compra/vitrine-home.ts"
  - "src/lib/vitrine-quick-flags.ts"
  - "src/app/produto/[id]/page.tsx"
  - "src/components/carrinho/carrinho.tsx"
  - "src/app/checkout/actions.ts"
  - "supabase/migrations/0140_checkout_cotacao_uber_direct.sql"
  - "src/app/api/carrinho/abandono/tick/route.ts"
---

# PRD 038: Ruptura de estoque — visibilidade na vitrine, alerta ao seller e roteamento para venda futura

## 1. Contexto

- **Produto/área**: catálogo, carrinho/checkout e painel do seller do marketplace Indústria 24h.
- **Estado atual (verificado no banco de produção `tiwdqgyeyvceaiqqwitc` em 16/09/2026)**:
  - 115 produtos aprovados; **50 deles (43%) estão com `estoque_atual <= 0` e continuam visíveis** na home, busca, categoria, loja, cross-sell do carrinho e feed de produtos. Nenhuma dessas consultas filtra estoque, só `status_produto = 'Aprovado'`.
  - **46 desses 50 têm oferta de venda futura ativa** (`vendas_futuras.estoque > 0`). A maioria é vendável, só que por reserva, não à vista.
  - A única barreira real é a RPC `checkout_criar_pedido`, que levanta `Estoque insuficiente de "%" (disponível: %)` na finalização.
  - O carrinho vive em `localStorage` e nunca é revalidado contra o banco: item adicionado quando havia saldo sobrevive indefinidamente.
  - No painel do seller já existe um contador "sem estoque" (`lte estoque_atual 0`) no sidebar e no dashboard, e a coluna de estoque fica amarela quando `estoque_atual < quantidade_minima`. Não há alerta ativo, nem e-mail, nem aviso na tela do produto individual.
- **Problema**: o comprador monta o carrinho, escolhe forma de pagamento e só então descobre que o produto não existe. O print do incidente de 16/09 mostra `Estoque insuficiente de "Bloco 14 milheiro" (disponível: 0)` na tela de pagamento, com R$ 105,00 já somados. O produto do print tem estoque 0 e **7 ofertas de venda futura ativas**: era vendável o tempo todo, pela porta errada. O seller, do outro lado, não recebe nenhum aviso de que 43% do catálogo dele parou de vender.

> Contexto técnico detalhado (RPC, índices, cron) vive no TRD. Aqui só o ponteiro para os arquivos acima.

## 2. Solução Proposta

### Visão de produto

Ruptura deixa de ser um erro de checkout e passa a ser um estado do produto, tratado em três frentes:

1. **Na vitrine**: produto sem saldo e sem reserva sai de circulação; produto sem saldo **com** venda futura continua visível, marcado como reserva, com previsão de entrega e preço da reserva.
2. **No carrinho e no checkout**: a indisponibilidade aparece na primeira tela em que é conhecida, não na última. Item que tem venda futura oferece a troca por reserva em vez de simplesmente travar.
3. **No painel do seller**: estoque crítico vira alerta visível na lista e na tela do produto, com um resumo diário por e-mail.

### Decisões de produto

1. **A regra não é "esconder quem não tem estoque"**, e sim: `estoque_atual <= 0` **e** sem venda futura ativa → some da vitrine. Com venda futura ativa → continua, como reserva. Esconder os 50 tiraria 46 produtos vendáveis do ar.
2. **Produto oculto por ruptura não muda `status_produto`.** Continua `Aprovado`; a ocultação é derivada do saldo e se desfaz sozinha quando o seller repõe. Motivo: `status_produto` é moderação da plataforma, não disponibilidade do seller.
3. **A URL do produto continua acessível** com aviso de indisponível e CTA para avisar quando voltar. Motivo: preservar SEO e links compartilhados; devolver 404 queima o histórico de indexação.
4. **Estoque crítico = `estoque_atual <= quantidade_minima`** quando o seller preencheu a quantidade mínima, e `estoque_atual <= 5` quando não preencheu. *(premissa: limiar padrão 5, confirme ou corrija)*
5. **O alerta por e-mail é um resumo diário por loja**, não um e-mail por produto. Motivo: o plano Vercel atual só permite cron diário (ver `vercel.json`), e um seller com 20 rupturas não pode receber 20 e-mails.
6. **Nenhuma trava nova no checkout.** A RPC já barra; este PRD move o aviso para antes, não duplica a regra.

### Fora do escopo

- Ledger de movimentação, reserva com expiração e estoque por local: é o PRD 036, que este PRD assume como próxima fase e não antecipa.
- Reposição sugerida e previsão de ruptura por histórico de venda.
- Alerta por WhatsApp ao seller. *(premissa: e-mail primeiro, WhatsApp depois, confirme ou corrija)*
- Integração com ERP/Bling para sincronizar saldo.

## 3. Funcionalidades

### US01: Produto em ruptura sai da vitrine, produto com reserva permanece

Como comprador, quero só ver produtos que posso efetivamente comprar, para não montar um carrinho que quebra no pagamento.

**Rules:**
- Produto `Aprovado` com `estoque_atual <= 0` e sem venda futura ativa não aparece em: home, busca, categoria, página da loja, cross-sell do carrinho, galerias e feed de produtos.
- Produto `Aprovado` com `estoque_atual <= 0` **com** venda futura ativa aparece normalmente, com selo de reserva e a previsão mais próxima visível no card.
- A página do produto (`/produto/[id]`) continua acessível nos dois casos, com o estado explícito e sem botão de compra à vista quando não há saldo.
- A regra vale igualmente para produto exibido por vitrine de afiliado.

**Edge cases:**
- Produto com saldo positivo mas abaixo da quantidade mínima de pedido → tratado como indisponível para compra à vista (ninguém consegue comprar 3 quando o mínimo é 10).
- Venda futura ativa cuja previsão já passou → não conta como reserva válida; o produto cai na regra de ruptura. *(premissa, confirme ou corrija)*
- Último item vendido durante a navegação → o comprador que já está na página vê o estado atualizado ao tentar adicionar, não no pagamento.

### US02: Carrinho avisa a ruptura e oferece a reserva

Como comprador, quero saber no carrinho que um item ficou indisponível e poder trocá-lo pela reserva, para não perder a compra inteira.

**Rules:**
- Ao abrir o carrinho e ao entrar no checkout, cada item é revalidado contra o saldo atual e contra a quantidade mínima.
- Item sem saldo e sem venda futura → marcado como indisponível, excluído do total, com ação de remover.
- Item sem saldo **com** venda futura ativa → oferece trocar por reserva, mostrando previsão e preço da reserva antes da confirmação. A troca só ocorre com ação explícita do comprador.
- Item com saldo menor que a quantidade no carrinho → oferece ajustar para o disponível.
- O botão de finalizar fica bloqueado enquanto houver item indisponível não resolvido, com o motivo ao lado do item, não só no rodapé.

**Edge cases:**
- Saldo acaba entre a revisão e a finalização → a RPC continua sendo a barreira final, e a mensagem de erro passa a apontar o item e oferecer a mesma troca por reserva, em vez do texto cru atual.
- Preço da reserva maior que o preço à vista → a diferença é mostrada explicitamente antes de confirmar a troca.
- Carrinho com um único item, indisponível → o comprador vê a sugestão de reserva ou o cross-sell, nunca um carrinho vazio sem explicação.

### US03: Estoque crítico no painel do seller

Como seller, quero ver de relance quais produtos estão acabando ou já acabaram, para repor antes de perder venda.

**Rules:**
- A lista de produtos ganha filtro por estado de estoque: todos, crítico, esgotado.
- Cada linha mostra o estado: esgotado (vermelho), crítico (amarelo), normal.
- A linha de produto esgotado indica se ele está fora da vitrine ou sendo exibido como reserva, para o seller entender por que parou (ou não) de vender.
- O card "precisa de você" do dashboard separa esgotados de críticos, hoje somados num contador só.
- Ordenação padrão da lista passa a trazer esgotado e crítico no topo. *(premissa, confirme ou corrija)*

**Edge cases:**
- Seller sem nenhum produto crítico → o bloco informa que está tudo em ordem, em vez de sumir sem explicação.
- Produto esgotado com venda futura ativa → não entra na contagem de "perdendo venda", e sim numa contagem própria de "vendendo por reserva".

### US04: Aviso de ruptura na tela do produto (seller e comprador)

Como seller, quero que a tela do produto me diga o que está acontecendo com ele, para não precisar cruzar telas.

**Rules:**
- Na edição do produto no painel do seller, um aviso no topo informa o estado de estoque, se o produto está visível na vitrine e, quando oculto, o que fazer para voltar (repor saldo ou criar oferta de venda futura).
- Na página pública do produto sem saldo e sem reserva, o bloco de compra é substituído por aviso de indisponível com a data em que esgotou. *(premissa: exibir a data, confirme ou corrija)*
- Na página pública do produto sem saldo e com reserva, o bloco de compra mostra a reserva como caminho principal, com previsão e condições.

**Edge cases:**
- Produto recém-criado com estoque 0 e sem reserva → o aviso no painel aparece já no primeiro salvamento, deixando claro que ele não vai aparecer na vitrine.
- Estoque reposto → o aviso some sem exigir republicação ou nova moderação.

### US05: Resumo diário de estoque por e-mail ao seller

Como seller, quero receber um aviso quando meus produtos entram em ruptura, para repor sem depender de entrar no painel.

**Rules:**
- Uma varredura diária identifica, por loja, os produtos esgotados e os críticos.
- A loja com pelo menos um produto esgotado ou crítico recebe um e-mail único com a lista, quantidade atual, mínimo e link direto para editar cada produto.
- O e-mail destaca separadamente os produtos que saíram da vitrine por ruptura, que é a perda de venda concreta.
- O mesmo produto não gera e-mail repetido enquanto o estado não mudar. *(premissa: reenvio só após reposição e nova queda, ou após 7 dias, confirme ou corrija)*
- Loja sem nenhuma ruptura não recebe e-mail.
- O envio reaproveita o remetente e o layout de marca já usados nos demais e-mails transacionais.

**Edge cases:**
- Loja sem e-mail cadastrado ou com envio recusado → o alerta permanece no painel e a falha fica registrada, sem quebrar a varredura das demais lojas.
- Seller com catálogo grande → a lista no e-mail é limitada às primeiras entradas, com o total e o link para o painel. *(premissa: limite de 20, confirme ou corrija)*
- Varredura executada duas vezes no mesmo dia → não duplica o e-mail.

### US06: Venda futura como saída da ruptura

Como seller, quero transformar um produto esgotado em reserva sem sair do fluxo, para continuar vendendo o que ainda vou produzir.

**Rules:**
- No aviso de ruptura do painel, há ação direta para criar oferta de venda futura para aquele produto, com previsão e quantidade.
- A oferta criada devolve o produto à vitrine imediatamente, como reserva.
- O estoque da oferta de venda futura é controlado separadamente do saldo à vista e aparece na lista de produtos como tal, não somado ao `estoque_atual`.
- Oferta de venda futura esgotada ou vencida devolve o produto ao estado de ruptura, com novo aviso.

**Edge cases:**
- Produto com saldo à vista e reserva simultâneos → o comprador escolhe; a compra à vista consome `estoque_atual` e a reserva consome o saldo da oferta, como a RPC já faz hoje.
- Previsão no passado no momento da criação → rejeitada.

## 4. Métricas de sucesso

- Erros de `Estoque insuficiente` na finalização do checkout caem a praticamente zero (hoje rastreados por `tags: { area: "estoque", signal: "estoque_insuficiente" }`).
- Nenhum produto sem saldo e sem reserva exibido na vitrine.
- Produtos vendáveis por reserva permanecem em circulação: os 46 de hoje não saem do ar.
- Tempo médio entre um produto esgotar e o seller repor ou criar reserva.

## 5. Premissas a confirmar com a dona

1. Limiar padrão de estoque crítico quando o seller não preencheu quantidade mínima (proposto: 5).
2. Venda futura com previsão vencida conta ou não como disponível.
3. Periodicidade e limite de reenvio do e-mail (proposto: diário, sem repetir enquanto o estado não mudar).
4. Exibir ou não a data em que o produto esgotou na página pública.
5. WhatsApp fica para depois do e-mail.
