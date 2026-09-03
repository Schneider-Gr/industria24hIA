## Context

Ver `proposal.md - Why` para a motivação. Estado atual relevante:

- Desconto hoje: só `promocoes_progressivas` (faixa por quantidade, por produto),
  regra pura replicada em `src/lib/preco-faixa.ts::precoFaixa`, também usada
  dentro da RPC `checkout_criar_pedido` (0150).
- Checkout: `src/app/checkout/actions.ts::finalizarCompra` agrupa o carrinho por
  loja e chama `checkout_criar_pedido` uma vez por loja. `pedidos.loja_id` é FK
  not null — não existe pedido multi-vendedor.
- A RPC `checkout_criar_pedido` tem uma cadeia de overloads por aridade
  (3→6 args, 0065/0074/0107/0119). A base de 3 args (redefinida em 0150) é onde
  vive toda a lógica; os overloads só delegam repassando `entrega` intacto.
  Parâmetros novos (`transportadora_id`, `cotacao_externa_id`, `cliente_nome`)
  viajam **dentro do objeto JSON `entrega`** para não alterar a assinatura.
- No insert de `linha_itens` (0150) a RPC grava `valor` (= `preco_faixa × qtd`),
  `repasse_ind` (= `round(valor × 0.05, 2)`, margem retida da plataforma) e
  `repasse_afiliado`. **`repasse_vendedor` NÃO é gravado.**
- **Achado (03/09): `linha_itens.repasse_vendedor` não é escrito por nenhuma
  migration nem por nenhum código em `src/`.** É só declarado (0005), somado para
  o repasse ao seller (`repasses_recalcular_pedido`, 0111; `calcular_repasses_pedido`,
  0084) e protegido pelos guards financeiros (0031/0038/0074/0109/0115). Para
  pedidos pós-rebuild ele é NULL. Confirmação do estado em produção e o desenho
  do pagamento correto ao seller ficam para a fase 2, junto com cupom de seller.
- `repasse_ind` é margem retida: não gera transferência PIX. O que a plataforma
  "ganha" é o resíduo do que o comprador pagou.
- Compra coletiva cria pedido no próprio fluxo de fechamento
  (`0077_coletiva_ciclo_vida_rateio.sql`), fora de `checkout_criar_pedido`.
- Regras do projeto: proibido mockar, proibido inventar schema, RLS
  deny-by-default, TDD red-green para função nova de regra de negócio, numeração
  manual de migration com checagem de colisão (skill `migrations-industria24`).

## Goals / Non-Goals

**Goals:**

- Cálculo do desconto 100% no servidor, com função pura testável espelhando a
  lógica SQL (mesmo padrão de `preco-faixa.ts`).
- Não alterar a assinatura de `checkout_criar_pedido`: o cupom entra via `entrega`.
- Não tocar o ledger de repasse nem os valores de repasse por linha.
- `linha_itens.valor` e `pedidos.valor_pedido` continuam sendo os valores que o
  Asaas e os relatórios já usam — `valor` cheio, `valor_pedido` líquido.

**Non-Goals (nível de design):**

- Cupom criado/custeado pelo seller. Fica para a fase 2, junto com a correção de
  `repasse_vendedor`.
- Unificar `promocoes_progressivas` e cupom num motor comum.
- Tocar o fluxo de pedido da compra coletiva.
- Frete grátis, empilhamento, cupom de afiliado, cupom em venda futura.

## Decisions

### D1 — Cupom entra pela `entrega`, cálculo dentro de `checkout_criar_pedido`

O código do cupom e o `checkout_ref` são anexados ao objeto `entrega` no
`finalizarCompra`, como `transportadora_id` já é. Dentro da RPC, antes de gravar
as linhas, uma função SQL `cupom_aplicar(p_codigo, p_itens_com_preco)` retorna,
por item, o desconto já limitado ao piso. Alternativas descartadas: (a) novo
parâmetro na assinatura — obriga replicar a cadeia de overloads; (b) calcular no
server action e passar o valor — viola "servidor autoritativo".

### D2 — Função pura `aplicarCupom` em `src/lib/pagamentos-financeiro/`

Recebe as regras do cupom e os itens já com
`{produto_id, categoria_id, loja_id, preco_base, preco_faixa, quantidade,
repasse_ind}` e devolve, por item, `{desconto}` (valor absoluto, ≥ 0, já limitado
ao `repasse_ind` da linha). Responsabilidades: casar regra por precedência de
alvo, calcular `preco_cupom` sobre `preco_base`, aplicar não-acumulação
(`max(0, (preco_faixa − preco_cupom)) × qtd`), aplicar o piso de `repasse_ind`.
Fica no módulo `pagamentos-financeiro` (CODEOWNERS) por tocar o caminho do
dinheiro. Teste companheiro `.test.ts` escrito antes (red-green): precedência de
alvo, `valor_fixo` maior que preço, progressivo vs. cupom nos dois sentidos, piso
de `repasse_ind`, linha sem margem. A função SQL `cupom_aplicar` é a réplica
autoritativa; a função TS serve o preview e os testes (contrato "réplica pura" de
`preco-faixa.ts`, comentário `ponytail:` cruzado).

### D3 — `cupons.dono` já existe, mas só `plataforma` no MVP

`cupons.dono` com CHECK que nesta entrega só admite `plataforma`; `cupons.loja_id`
fica NULL. A coluna existe para a fase 2 (cupom de seller) não exigir migration de
schema, só afrouxar o CHECK e adicionar policy. Elegibilidade no MVP: qualquer
item, qualquer loja.

### D4 — Reavaliação multiloja é emergente, não calculada

Como `checkout_criar_pedido` roda uma vez por loja e o cupom é reavaliado contra
os itens de cada pedido, o "rateio proporcional" acontece naturalmente. Não há
passo de divisão de um valor global. O único estado compartilhado entre os
pedidos do mesmo checkout é o contador de uso — resolvido em D5.

### D5 — Consumo de uso: claim atômico + chave de checkout

Tabela `cupom_usos (cupom_id, user_id, checkout_ref, pedido_id, criado_em)` com
unique `(cupom_id, checkout_ref)`. O `checkout_ref` é um identificador do
checkout (não do pedido), gerado no `finalizarCompra` e passado a todas as
chamadas de RPC daquele checkout. A RPC faz
`insert ... on conflict (cupom_id, checkout_ref) do nothing` e, na mesma
transação, um `update cupons set usos = usos + 1 where id = ? and (limite_global
is null or usos < limite_global)` condicional; se o update afeta 0 linhas, o
cupom não é aplicado neste pedido. O teto por cliente é um `count` de
`checkout_ref` distintos em `cupom_usos` por `user_id`. O retry do mesmo checkout
cai no `on conflict do nothing` e não incrementa.

### D6 — Não-acumulação comparando preço unitário final

Dentro da RPC, para cada item já se conhece `preco_faixa` (via `preco_faixa`
SQL). `aplicarCupom` calcula `preco_cupom` sobre `preco_base` e o desconto do
item é `max(0, (preco_faixa − preco_cupom)) × qtd`. Quando `preco_faixa` já é
menor ou igual, o desconto é zero. `linha_itens.valor` **não muda** — continua
`preco_faixa × qtd`; o abatimento vive só em `desconto_cupom`.

### D7 — Piso de repasse: desconto da linha ≤ `repasse_ind` da linha

O custeio é 100% da plataforma e a margem da plataforma por linha é o
`repasse_ind` (5% de `valor`). O desconto gravado em `linha_itens.desconto_cupom`
é `least(desconto_calculado, repasse_ind_da_linha)`. Se `repasse_ind` for zero, a
linha não recebe desconto. Não há piso de seller nem de afiliado porque nem
`repasse_vendedor` nem `repasse_afiliado` são tocados.

### D8 — Valor mínimo de pedido conferido antes do desconto

`cupons.valor_minimo_pedido` compara contra o valor de mercadoria (soma de
`preco_faixa × qtd`, sem frete, sem desconto de cupom). Evita o comprador
"perder" o mínimo por causa do próprio cupom. `lojas.valor_pedido_minimo`
continua sendo conferido como hoje, também sobre o valor pré-cupom.

### D9 — Liberação de uso só em cancelamento pré-pagamento

Onde o pedido é cancelado antes de `Pagamento Realizado` (expiração/cancelamento
de cobrança Asaas, cancelamento pelo comprador), a rotina de cancelamento faz
`delete from cupom_usos where pedido_id = ?` e decrementa `cupons.usos`.
Reembolso pós-pagamento não devolve — decisão de simplicidade, registrada como
possível evolução.

### D10 — Opção C: desconto à parte, `valor` e ledger intocados

O desconto do cupom não altera `linha_itens.valor` nem os repasses. Vive em
`linha_itens.desconto_cupom` (nullable, default null) + `linha_itens.cupom_id`.
`pedidos.valor_pedido = Σ(linha_itens.valor) + frete − Σ(linha_itens.desconto_cupom)`.

Por que não as outras:

- **Opção A (reduzir `linha_itens.valor`)**: `repasse_ind` e `repasse_afiliado`
  recalculariam sobre o valor menor, fazendo afiliado e plataforma "pagarem"
  parte do desconto — fere "quem cria paga".
- **Opção B (repasse_vendedor explícito + subtração em 0111)**: respeitaria o
  custeio mas obrigaria a passar a popular `repasse_vendedor` para todo pedido e
  a mexer em `repasses_recalcular_pedido` — ampliação no caminho do dinheiro que
  o dono vetou nesta entrega.

Consequência de C: cupom de seller não cabe (o seller só absorveria via 0111,
que não muda) → MVP só plataforma. Como `repasse_ind` é retido, "a plataforma
paga" = "a plataforma recebe menos do comprador", sem transferência a ajustar.

## Risks / Trade-offs

- **Cadeia de overloads da RPC** → anexar via `entrega` evita mexer na
  assinatura, mas `entrega` vira um saco de parâmetros. Mitigação: documentar no
  comentário da migration, como 0140/0150.
- **Divergência função SQL ↔ função TS** → mesmo risco de `preco-faixa.ts`.
  Mitigação: comentário `ponytail:` cruzado + testes que exercitam os mesmos
  casos.
- **`desconto_cupom` somado errado nos relatórios de GMV / a-receber** → o
  dashboard de KPIs (#490) e os painéis que mostram breakdown precisam subtrair
  `desconto_cupom` de forma consistente. Item de verificação no tasks.
- **Cupom aplicado no preview mas inválido na finalização** → a spec permite os
  dois desfechos (criar sem desconto e avisar, ou rejeitar). Decisão de UX no
  tasks/implementação.
- **Colisão de número de migration** → rodar a regra do CI
  (`ls supabase/migrations | grep -oE '^[0-9]{4}' | sort | uniq -d`) na criação
  e de novo antes do PR.
- **Interação com estorno interno existente** (skill `asaas-pagamentos`) →
  verificar se o estorno recalcula a partir de `linha_itens.valor` (que segue
  cheio) ou de `pedidos.valor_pedido` (líquido). O estorno ao comprador deve ser
  sobre `valor_pedido` líquido.

## Migration Plan

1. Migration nova (número após checagem de colisão): tabelas `cupons`,
   `cupom_regras`, `cupom_usos` com RLS ativado e policies (só admin gerencia;
   comprador sem acesso a `cupom_usos`); colunas `cupom_id` e `desconto_cupom`
   em `linha_itens`; função SQL `cupom_aplicar`; lógica interna nova de
   `checkout_criar_pedido` (base de 3 args) lendo `entrega->>'cupom_codigo'` e
   `entrega->>'checkout_ref'`, gravando `desconto_cupom`/`cupom_id` e
   `pedidos.valor_pedido` líquido; RPC `cupom_validar` para o preview; ajuste na
   rotina de cancelamento pré-pagamento para liberar o uso.
   **`repasses_recalcular_pedido` e `calcular_repasses_pedido` não são tocadas.**
2. Testar a migration inteira em `begin; ... select <verificações>; rollback;`
   via `supabase db query --linked` antes de aplicar — incluindo um checkout
   simulado com cupom que exercite o piso de `repasse_ind`.
3. Aplicar em produção; regenerar `database.types.ts` com token e conferir diff.
4. Deploy do código (função pura + UI admin + campo no checkout) via PR; o PR
   toca o caminho do dinheiro → confirmação do dono antes do merge.
5. **Rollback**: `cupom_id` e `desconto_cupom` são nullable default null; remover
   o campo de cupom do checkout e desativar a tela admin volta ao comportamento
   atual sem migration reversa. A RPC ignora `entrega` sem `cupom_codigo`.
   Tabelas novas ficam órfãs mas inertes.

## Open Questions

- Formato exato do `checkout_ref` (uuid no server action vs. derivado) — decisão
  de implementação, não muda spec.
- Confirmar em produção se `repasse_vendedor` está preenchido e por qual caminho
  — necessário só para a fase 2 (cupom de seller), não bloqueia este MVP.
