## Context

`add-cupom-desconto-checkout` (PR #497, spec arquivada em
`openspec/specs/checkout-cupom-desconto/spec.md`) entregou cupom de plataforma
com custeio via `desconto_cupom` separado, piso em `repasse_ind`. O design
daquela change cortou cupom de seller porque `linha_itens.repasse_vendedor`
não é escrito por nenhum código do repo (achado técnico registrado lá).

Achado desta change (03/09, mesma sessão): **293/303 linhas têm
`repasse_vendedor` preenchido em produção**, inclusive 61/71 linhas
pós-rebuild — mas nenhuma migration nem código do app escreve isso. É drift
(SQL manual fora de versionamento). Confirmação do dono: cupom de loja **não
deve envolver repasse** — "o desconto é feito na margem do produto antes de
passar pelo Asaas". Isso elimina a necessidade de tocar `repasse_vendedor` de
qualquer forma: em vez de um abatimento à parte, o cupom de loja reduz o preço
unitário diretamente, exatamente como `preco_faixa` (desconto progressivo) já
faz hoje.

## Decisions

### D1 — Cupom de loja muda `valor`; cupom de plataforma continua com `desconto_cupom` à parte

Dois mecanismos coexistindo na mesma tabela `cupons`/`cupom_regras`,
diferenciados por `dono`:

- `plataforma` (já em produção): `valor` cheio, desconto em
  `desconto_cupom`, piso em `repasse_ind`. Inalterado.
- `loja` (novo): preço final do item = `min(preco_faixa, preco_cupom)`,
  igual à comparação que já existe entre progressivo e cupom; a diferença é
  que esse preço final **vira o `linha_itens.valor` de fato**, não um
  registro à parte. `repasse_ind`/`repasse_afiliado` nascem sobre ele, como
  sempre nasceram sobre `preco_faixa`. `desconto_cupom`/`cupom_id` ainda são
  gravados (auditoria/exibição), mas não entram em nenhum cálculo de repasse.

Por que isso é seguro: o pipeline de repasse já lida com preço variável por
item (é assim que desconto progressivo funciona desde a 0016). Cupom de loja
não é um caminho novo de dinheiro — é uma terceira fonte de "preço com
desconto" no mesmo pipeline que `preco_faixa` já alimenta.

### D2 — Sem piso para cupom de loja

Cupom de plataforma tem piso porque o custeio sai de uma margem fixa
(`repasse_ind`, 5%) que não pode ficar negativa. Cupom de loja não tem esse
problema: o seller está decidindo o próprio preço de venda, o mesmo risco que
ele já assume ao cadastrar uma faixa progressiva agressiva. Nenhum piso novo.

### D3 — Alvo restrito a `produto`/`loja` para cupom de loja

Pedido explícito do dono: "cupom por produto, múltiplos descontos diferentes
no mesmo cupom, e cupom para a loja inteira". `categoria` e `tudo` não fazem
sentido escopados a uma única loja (categoria é cross-loja; tudo é
marketplace inteiro). Validado no server action do seller e, se possível, em
CHECK/trigger na tabela.

### D4 — Função de preço compartilhada

Nova função (SQL + TS) `precoComCupom(regras, produto_id, categoria_id?,
loja_id, preco_base) -> preco_unitário_com_cupom` — a resolução de regra por
precedência de alvo, já existente dentro de `cupom_desconto_item`, é extraída
para ser reutilizável nos dois caminhos:

- Caminho plataforma: `cupom_desconto_item` chama `precoComCupom` e depois
  aplica `max(0, preco_faixa - preco_cupom) * qtd`, com piso.
- Caminho loja (novo): `checkout_criar_pedido` chama `precoComCupom`
  diretamente e usa `least(preco_faixa, preco_cupom)` como o preço final do
  item, sem piso.

### D5 — Elegibilidade e reavaliação multiloja

Cupom de loja só é elegível para itens de `loja_id = cupom.loja_id`. Como
cada loja já vira um pedido próprio, cupom de loja nunca atravessa pedidos —
não há rateio a desenhar (diferente do cupom de plataforma, que pode).

### D6 — Repasse automático ao seller (0111) fora de escopo

O achado de que `repasse_vendedor` nunca é escrito por código continua
verdadeiro e continua sendo um problema real e separado (repasse automático
ao seller na confirmação de entrega provavelmente não funciona hoje para
pedido novo). Esta change **não mexe nisso** — ficou explicitamente fora, por
decisão do dono, e permanece registrado como dívida técnica a investigar (ver
`openspec/changes/add-cupom-desconto-checkout` arquivada, seção de achados).

## Migration Plan

1. Migration nova: afrouxa `cupons_dono_check` para incluir `loja`; adiciona
   policies RLS de seller (gerencia `dono='loja' and loja_id=própria loja`;
   lê `cupom_usos` da própria loja); extrai `cupom_preco_regra` (a resolução
   de alvo/preço) como função reutilizável; `cupom_desconto_item` passa a
   chamá-la; `checkout_criar_pedido` ganha o branch `dono='loja'` no loop de
   linhas, usando o preço reduzido como `valor`; `cupom_validar` ganha o
   mesmo branch para o preview refletir o preço reduzido corretamente.
2. Testar em `begin; ... rollback;` antes de aplicar, incluindo cupom de loja
   sintético comparado com faixa progressiva nos dois sentidos.
3. Aplicar, regenerar `database.types.ts`.
4. UI `/seller/cupons` + policy check.
5. Testar de novo em produção com cupom real (SQL + clique real no checkout
   logado), como feito para a entrega anterior.

## Open Questions

Nenhuma nova; herda as da change anterior (formato de `checkout_ref`, drift
de `repasse_vendedor` como item de investigação futura).
