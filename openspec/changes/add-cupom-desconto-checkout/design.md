## Context

Ver `proposal.md - Why` para a motivação. Estado atual relevante:

- Desconto hoje: só `promocoes_progressivas` (faixa por quantidade, por produto),
  regra pura replicada em `src/lib/preco-faixa.ts::precoFaixa`, também usada
  dentro da RPC `checkout_criar_pedido`.
- Checkout: `src/app/checkout/actions.ts::finalizarCompra` agrupa o carrinho por
  loja e chama `checkout_criar_pedido` uma vez por loja. O `pedidos.loja_id` é
  FK not null — não existe pedido multi-vendedor.
- A RPC `checkout_criar_pedido` tem uma cadeia de overloads por aridade
  (3→6 args, migrations 0065/0074/0107/0119/0140). Parâmetros adicionados
  recentemente (`transportadora_id`, `cotacao_externa_id`, `cliente_nome`)
  viajam **dentro do objeto JSON `entrega`** justamente para não alterar a
  assinatura e não replicar wrappers.
- Split do dinheiro é por linha: `linha_itens.repasse_vendedor`,
  `repasse_afiliado`, `repasse_ind`. Calculados na criação do pedido. O repasse
  automático na entrega (`repasses_recalcular_pedido`, migration 0111) apenas
  soma essas colunas.
- Compra coletiva cria pedido no próprio fluxo de fechamento
  (`0077_coletiva_ciclo_vida_rateio.sql`), fora de `checkout_criar_pedido`.
- Regras do projeto: proibido mockar, proibido inventar schema, RLS
  deny-by-default, TDD red-green para função nova de regra de negócio,
  numeração manual de migration com checagem de colisão (skill
  `migrations-industria24`).

## Goals / Non-Goals

**Goals:**

- Cálculo do desconto 100% no servidor, com uma função pura testável espelhando a
  lógica SQL (mesmo padrão de `preco-faixa.ts`).
- Não alterar a assinatura de `checkout_criar_pedido`: o cupom entra via `entrega`.
- Manter `linha_itens.valor` e `pedidos.valor_pedido` como valores líquidos, para
  que Asaas e o repasse na entrega não precisem de lógica nova.
- Comissão do afiliado imutável sob cupom.

**Non-Goals (nível de design):**

- Não unificar `promocoes_progressivas` e cupom num motor comum agora — só deixar
  a função pura desenhada sem impedir isso depois.
- Não tocar o fluxo de pedido da compra coletiva.
- Sem frete grátis, sem empilhamento, sem cupom de afiliado, sem cupom em venda
  futura (ver `proposal.md`).

## Decisions

### D1 — Cupom entra pela `entrega`, cálculo dentro de `checkout_criar_pedido`

O código do cupom é anexado ao objeto `entrega` no `finalizarCompra`, como
`transportadora_id` já é. Dentro da RPC, antes de gravar as linhas, uma função
SQL `cupom_aplicar(p_codigo, p_loja_id, itens_com_preco)` retorna, por item, o
desconto e o repasse ajustado. Alternativas descartadas: (a) novo parâmetro na
assinatura — obriga replicar toda a cadeia de overloads e arrisca colisão de tipo
entre eles (o próprio código da 0107 alerta disso); (b) calcular no server action
e passar o valor — viola "servidor autoritativo", cliente poderia adulterar.

### D2 — Função pura `aplicarCupom` em `src/lib/pagamentos-financeiro/`

Assinatura conceitual: recebe as regras do cupom, o dono, os itens já com
`{preco_base, preco_faixa, repasse_vendedor, repasse_afiliado, repasse_ind}` e
devolve, por item, `{desconto, repasse_vendedor', repasse_ind', aplicado:boolean}`.
Responsabilidades: casar regra por precedência de alvo, escolher o menor entre
`preco_faixa` e `preco_cupom` (não-acumulação), aplicar piso de repasse, marcar
item inelegível. Fica no módulo `pagamentos-financeiro` (CODEOWNERS) por tocar
repasse. Teste companheiro `.test.ts` escrito antes (red-green), cobrindo:
precedência de alvo, valor_fixo maior que preço, piso de plataforma com afiliado,
piso de seller, progressivo vs cupom nos dois sentidos. A função SQL
`cupom_aplicar` é a réplica autoritativa; a função TS serve o preview e os testes
(mesmo contrato "réplica pura" de `preco-faixa.ts`).

### D3 — Escopo derivado do dono, não campo separado

`cupons.dono ∈ {plataforma, loja}` + `cupons.loja_id` (null para plataforma).
Não há campo de "escopo" — ele é função do dono. Isso torna impossível o estado
inválido "cupom de loja com escopo marketplace". A elegibilidade por item:
cupom de loja exige `item.loja_id = cupom.loja_id`; cupom de plataforma aceita
qualquer loja.

### D4 — Rateio multiloja é emergente, não calculado

Como `checkout_criar_pedido` roda uma vez por loja e o cupom é reavaliado contra
os itens de cada pedido, o "rateio proporcional" acontece naturalmente: cada
pedido aplica as regras aos seus próprios itens. Não há um passo de divisão de um
valor global. O único estado compartilhado entre os pedidos do mesmo checkout é
o **contador de uso** — resolvido em D5.

### D5 — Consumo de uso: claim atômico + chave de checkout

Tabela `cupom_usos (cupom_id, user_id, checkout_ref, pedido_id, criado_em)`. O
`checkout_ref` é um identificador do checkout (não do pedido), gerado no
`finalizarCompra` e passado a todas as chamadas de RPC daquele checkout. A RPC
faz `insert ... on conflict (cupom_id, checkout_ref) do nothing` e, na mesma
transação, um `update cupons set usos = usos + 1 where id = ? and (limite_global
is null or usos < limite_global)` condicional; se o update afeta 0 linhas, o
cupom não é aplicado neste pedido. O teto por cliente é um `count` em
`cupom_usos` por `user_id` com `checkout_ref` distinto. O retry do mesmo checkout
cai no `on conflict do nothing` e não incrementa. Alternativa descartada: contar
por `pedido_id` — quebraria o "um uso por checkout multiloja".

### D6 — Não-acumulação comparando preço unitário final

Dentro da RPC, para cada item já se conhece `preco_faixa` (via `precoFaixa` SQL).
`aplicarCupom` calcula `preco_cupom` sobre `preco_base` e o item usa
`min(preco_faixa, preco_cupom)`. Quando `preco_faixa` vence, `aplicado=false` e
nenhum repasse é mexido. Quando o cupom vence, a diferença
`preco_base - preco_cupom` (por unidade × quantidade) é o desconto, debitado do
repasse do dono.

### D7 — Piso de repasse

Cupom de plataforma: `desconto ≤ repasse_ind_item - 0` **após** reservar
`repasse_afiliado` integralmente (ou seja, o `repasse_ind` já é o resíduo depois
de vendedor e afiliado; a checagem é `desconto ≤ repasse_ind`). Cupom de loja:
`desconto ≤ repasse_vendedor`. Falhou o piso → `aplicado=false` para o item, sem
abortar o pedido.

### D8 — Valor mínimo de pedido conferido antes do desconto

O `cupons.valor_minimo_pedido` compara contra o valor de mercadoria (soma de
`preco_faixa × qtd`, sem frete, sem desconto de cupom). Evita o comprador
"perder" o mínimo por causa do próprio cupom e evita deadlock com
`lojas.valor_pedido_minimo` (que continua sendo conferido como hoje, também sobre
o valor pré-cupom).

### D9 — Liberação de uso só em cancelamento pré-pagamento

Onde o pedido é cancelado antes de `Pagamento Realizado` (expiração/cancelamento
de cobrança Asaas, cancelamento pelo comprador), um gatilho ou a própria rotina
de cancelamento faz `delete from cupom_usos where pedido_id = ?` e decrementa
`cupons.usos`. Reembolso pós-pagamento não devolve — decisão de simplicidade
desta entrega, registrada como possível evolução.

## Risks / Trade-offs

- **Cadeia de overloads da RPC** → anexar via `entrega` evita mexer na
  assinatura, mas o objeto `entrega` vira um saco de parâmetros. Mitigação:
  documentar no comentário da migration, como as anteriores fizeram.
- **Divergência função SQL ↔ função TS** → mesmo risco de `preco-faixa.ts`.
  Mitigação: comentário `ponytail:` cruzado nos dois arquivos + testes que
  exercitam os mesmos casos.
- **`repasse_ind` negativo por bug de piso** → migration de DML testada em
  `begin; ... select; rollback;` antes de aplicar; teste de piso obrigatório na
  função pura; considerar `check (repasse_ind >= 0)` na coluna se não existir.
- **`database.types.ts` truncado ao regenerar sem token** → conferir diff após
  `supabase generate typescript types`, como a skill `migrations-industria24`
  exige.
- **Cupom aplicado no preview mas inválido na finalização** → a spec permite os
  dois desfechos (criar sem desconto e avisar, ou rejeitar). Decisão de UX fica
  para o tasks/implementação; não muda o schema nem a RPC.
- **Colisão de número de migration** → rodar a regra do CI
  (`ls supabase/migrations | grep -oE '^[0-9]{4}' | sort | uniq -d`) na criação
  e de novo antes do PR.
- **Interação com estorno interno existente** (skill `asaas-pagamentos`, ledger
  de repasse) → verificar se o estorno recalcula a partir de `linha_itens` (ok,
  já líquido) ou de algum valor bruto guardado à parte.

## Migration Plan

1. Migration nova (número após checagem de colisão): tabelas `cupons`,
   `cupom_regras`, `cupom_usos` com RLS ativado e policies (admin para
   plataforma; seller dono para loja; comprador sem escrita); colunas
   `cupom_id` e `desconto_cupom` em `linha_itens`; função SQL `cupom_aplicar`;
   novo overload / lógica interna de `checkout_criar_pedido` lendo
   `entrega->>'cupom_codigo'` e `entrega->>'checkout_ref'`; RPC `cupom_validar`
   para o preview; gatilho/rotina de liberação de uso no cancelamento.
2. Testar a migration inteira em transação com rollback via
   `supabase db query --linked` antes de aplicar.
3. Aplicar em produção; regenerar `database.types.ts` com token e conferir diff.
4. Deploy do código (função pura + UI admin/seller + campo no checkout) via PR;
   o PR toca caminho do dinheiro → confirmação do dono antes do merge.
5. **Rollback**: as colunas novas em `linha_itens` são nullable e default null;
   remover o campo de cupom do checkout e desativar as telas volta ao
   comportamento atual sem migration reversa. A RPC ignora `entrega` sem
   `cupom_codigo`. Tabelas novas ficam órfãs mas inertes.

## Open Questions

- Formato exato do `checkout_ref` (uuid gerado no server action vs derivado) —
  não muda spec nem tasks, decisão de implementação.
- Se `linha_itens` já tem `check (repasse_ind >= 0)` — verificar no schema real
  na hora de escrever a migration; se não tiver, adicionar.
