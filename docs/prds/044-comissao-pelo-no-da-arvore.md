---
prd_number: "044"
status: em-progresso
priority: alta
created: 2026-09-18
issue: ""
depends_on: ["037", "041"]
references:
  - docs/prds/037-comissao-plataforma-por-categoria.md
  - docs/prds/041-taxonomia-importavel-e-comissao-por-no.md
  - supabase/migrations/0188_taxonomia_martins_sugestao_produto.sql
  - supabase/migrations/0189_comissao_por_no_da_arvore.sql
  - https://www.google.com/basepages/producttype/taxonomy-with-ids.pt-BR.txt
  - https://api.mercadolibre.com/categories/MLB1500
---

# PRD 044: Comissão da plataforma pelo nó da árvore de categorias

## 1. Contexto

- **Produto/área**: marketplace Indústria 24h, comissão da plataforma e repasse ao seller.
- **Estado atual**: o PRD 037 (0180) cobra a comissão por subcategoria, depois por categoria e, na falta das duas, 5%. O PRD 041 criou uma árvore de profundidade livre (`/admin/taxonomia`) que hoje reúne Google (5.595 nós), Martins (401) e Mercado Livre (12.233). O admin grava percentual por nó, mas **nenhuma venda lê esse percentual**. Além disso, três pontos do fluxo ignoravam até a regra do 037 e cobravam 5% fixo: a prévia do cupom e as duas etapas da compra coletiva.
- **Problema**: o admin define um percentual por categoria na árvore e ele não chega à comissão da loja nem ao repasse. A plataforma fica com duas regras de comissão, e a compra coletiva cobra diferente do checkout.

## 2. Solução Proposta

### Visão de produto

- O seller escolhe o nó da árvore no cadastro do produto (Google, Martins ou Mercado Livre), com sugestão pelo nome.
- O admin define o percentual em qualquer nível da árvore; os descendentes herdam até alguém definir outro mais abaixo.
- Toda venda (checkout, cupom e compra coletiva) calcula a comissão pela mesma regra e grava o percentual usado na linha do pedido.
- O repasse ao seller desconta exatamente a comissão gravada na venda.

### Decisões de produto

1. **Precedência**: percentual explícito na cadeia do nó da árvore do produto > subcategoria > categoria > 5%. A árvore é o modelo novo e mais específico; categoria/subcategoria seguem valendo para quem não tem nó ou cuja cadeia não tem percentual. *(premissa — confirme ou corrija)*
2. **Zero é diferente de vazio**: 0% é comissão nula deliberada e não herda; vazio herda do ancestral (mesma semântica do 037).
3. **Snapshot**: o percentual vigente na hora da venda fica gravado no item do pedido. Mudar o percentual depois não altera pedidos existentes nem repasses já calculados.
4. **Árvore nasce neutra**: nenhum nó tem percentual no deploy, então nenhum preço ou repasse muda até o admin digitar.
5. **Recusa acima de 100%**: comissão da plataforma somada à do afiliado acima de 100% recusa o pedido nomeando o produto (regra do 037, mantida).

### Fora do escopo

- Homologação da categoria escolhida pelo seller. O seller ainda pode escolher o nó mais barato; a trava fica para um PRD próprio. *(premissa — confirme ou corrija)*
- Unificar ou apagar `categorias`/`subcategorias`: elas seguem como fallback e como navegação da vitrine.
- Recalcular pedidos antigos com a regra nova.
- Atualização automática periódica das árvores das fontes; a reimportação é manual pelo admin.
- Comissão por produto individual (decisão do 037: subcategoria/nó bastam).

## 3. Funcionalidades

### US01: Árvore completa disponível no admin e no cadastro

Como seller, quero escolher a categoria do meu produto numa árvore que cubra o que eu vendo, para ser encontrado e cobrado corretamente.

**Rules:**
- A árvore oferece as fontes Google, Martins e Mercado Livre, navegável nível a nível no formulário do produto (seller e admin).
- "Sugerir pelo nome" preenche categoria e subcategoria pela votação dos produtos já classificados com nome parecido e lista nós da árvore candidatos.
- Nó obsoleto ou não selecionável não aparece para escolha.
- Caminho idêntico em duas fontes vira um nó só; os filhos das duas fontes ficam debaixo dele.

**Edge cases:**
- Nome do produto vazio ao pedir sugestão → nenhuma sugestão, sem erro.
- Nó escolhido é apagado depois → o produto perde o nó e cai na regra de subcategoria/categoria.
- Fonte reimportada sem um nó que já existia → o nó vira obsoleto, nunca é apagado, e produtos ligados a ele seguem com a comissão da cadeia.

### US02: Admin define o percentual por nó

Como admin, quero gravar o percentual de comissão em qualquer nível da árvore, para cobrar diferente por categoria.

**Rules:**
- O valor aceita de 0 a 100; vazio volta a herdar.
- A tela mostra, para cada filho, o percentual efetivo herdado do pai.
- Gravar sem efeito (nó inexistente) mostra erro, nunca sucesso silencioso.

**Edge cases:**
- Percentual fora de 0 a 100 → recusado com mensagem.
- Usuário não admin chama a gravação → recusado.

### US03: A venda cobra pela árvore

Como plataforma, quero que checkout, cupom e compra coletiva usem a mesma regra, para que a comissão da loja seja a mesma em qualquer canal.

**Rules:**
- A comissão da linha = valor do item × percentual efetivo (precedência da decisão 1), arredondada em centavos.
- O percentual efetivo fica gravado no item (snapshot).
- A prévia do cupom de plataforma limita o desconto à comissão calculada pela mesma regra.
- Compra coletiva (participação e fechamento) usa a mesma regra; antes cobrava 5% fixo.

**Edge cases:**
- Produto sem nó, sem subcategoria e sem categoria → 5%.
- Nó com 0% num ancestral e 10% na subcategoria → 0% (a árvore vence).
- Comissão + afiliado > 100% → pedido recusado com o nome do produto.

### US04: O repasse reflete a comissão

Como seller, quero receber o valor do item menos a comissão efetivamente cobrada e a do afiliado, para que o split bata com o que foi anunciado.

**Rules:**
- Repasse ao seller = valor do item − comissão da plataforma gravada − comissão do afiliado.
- Estorno e disputa usam os valores gravados na linha, nunca recalculam pela regra vigente.

**Edge cases:**
- Admin muda o percentual entre a venda e o pagamento → o repasse usa o snapshot da venda.

## 5a. Critérios de aceite

- [x] Árvore com Google, Martins e Mercado Livre navegável no cadastro do produto (seller e admin).
- [x] Salvar 7% num nó em `/admin/taxonomia` persiste e aparece ao recarregar.
- [x] Produto ligado a um nó cujo avô tem 12% gera, num pedido de R$ 20,00, comissão de R$ 2,40 e snapshot 12,00 (validado em transação revertida em 18/09).
- [x] Sem nenhum percentual na árvore, todo pedido segue com a mesma comissão de antes do deploy.
- [ ] Prévia do cupom e compra coletiva cobram pela mesma regra do checkout.
- [ ] Repasse do seller = valor − comissão gravada − afiliado.

## 5b. Métricas de sucesso

- Produtos com nó da árvore: 0 → 80% dos aprovados em 30 dias. *(premissa — confirme ou corrija)*
- Divergência entre comissão cobrada e percentual efetivo do produto no momento da venda: 0.

## 6. Milestones

### Milestone 1: Comissão da árvore em todo o fluxo de venda
- **USs**: US01, US02, US03, US04
- **Por que é um marco**: é o primeiro momento em que o percentual digitado pelo admin muda dinheiro de verdade.
- **Checklist de aceite**: todos os itens de §5a.

## 7. Registro de Decisões

- `depends_on` 037: reusa a semântica de precedência, snapshot e recusa acima de 100%.
- `depends_on` 041: a árvore, a importação e a tela de percentual por nó vêm dele; este PRD é o Milestone 3 dele (ligar a árvore à venda).
- 18/09: a dona pediu que o percentual da árvore reflita na comissão da loja, no split e em todo o fluxo, o que resolve a dúvida de "2 níveis x profundidade livre" do 041 a favor da árvore, com o legado mantido como fallback.
- 18/09: achado na implementação: `cupom_validar`, `coletiva_participar` e `coletiva_fechar` cobravam 5% fixo desde antes do 037.

## 8. Referências

- PRD 037, PRD 041, migrations 0188 e 0189.
- Google Product Taxonomy pt-BR (2021-09-21), Martins Atacado (snapshot 18/09), API pública de categorias do Mercado Livre (`/categories/{id}`, varredura de 18/09).

## 9. Estado da implementação (18/09/2026)

- Migrations 0188 e 0189 **aplicadas em produção** e conferidas no schema: `comissao_pct_produto` existe, e checkout, `cupom_validar`, `coletiva_participar` e `coletiva_fechar` passaram a chamá-la. Nenhum nó tem percentual, então a cobrança segue idêntica até o admin digitar.
- Árvores: Google 5.595 e Martins 401 nós em produção. Mercado Livre (12.233) com a origem liberada e o snapshot em `supabase/seed/taxonomia_mercadolivre.txt`; a importação em produção depende de execução manual.
- Código (seletor de árvore no cadastro, sugestão, gravação do percentual pelo admin) em master via PRs #694 e #696. O deploy da Vercel ficou barrado pelo limite diário de builds do plano em 18/09.
- Pendente para `concluido`: marcar o checklist de §5a em produção depois do deploy.
- 18/09, validação em produção (deploy `industria24h-gejk0az21` pela CLI): seller vê 81 raízes e a sugestão de "Alface crespa hidropônica" preenche Hortifrúti > Folhosas e o nó Google ...Verduras > Alface; admin salvou 7% em "Adultos", o banco gravou 7,00, o filho exibiu "herda 7,00%" e o valor foi apagado de volta pela tela (0 nós com percentual). Pendentes no checklist: cupom e compra coletiva em pedido real, e repasse de um pedido pago.
