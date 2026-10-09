## Context

Ver `proposal.md` (estado verificado em 09/10/2026) e o PRD 061. Esta change detalha como o
simulador e o preço vão funcionar; os números de exemplo são os do vídeo-prévia (açaí).

## Goals / Non-Goals

**Goals:** simulação na tela igual ao preço cobrado; lote com curva e com mínimo sem
depender de estorno; lotes atuais intactos.

**Non-Goals:** previsão de demanda por histórico; antecipar repasse; simulador para o
comprador; curva linear; estorno.

## Decisions

### D1. Modelo da curva: jsonb no lote

`vendas_futuras.curva jsonb not null default '[]'`, array de até 3
`{ "dias_antes": int > 0, "desconto_pct": int 1..90 }`.

- Mesmo padrão de `promocoes_progressivas.faixas` e `compras_coletivas.lotes` (jsonb).
- Validação por trigger: até 3 itens, `dias_antes` distintos, desconto não crescente em
  direção à entrega (quanto maior `dias_antes`, maior ou igual o desconto).
- `desconto_pct` **inteiro** para o arredondamento ser exato (D3).
- Colunas novas também: `producao_prevista int` (informativa, alimenta a receita do
  simulador) e `entrega date` só se `previsao` não servir. **Decisão:** reaproveitar
  `previsao` como data de entrega; não criar coluna nova.

Alternativa descartada: tabela `vendas_futuras_degraus`. Mais joins para no máximo 3 linhas,
sem ganho de consulta.

### D2. Degrau vigente

`dias = previsao − data_da_reserva` (datas no fuso `America/Manaus`).
Degrau vigente = o de **maior** `dias_antes` com `dias_antes <= dias`. Nenhum → desconto 0.

Exemplo (entrega 15/12/2026, curva 60/15, 30/10, 7/5):

| Reserva em | dias | Degrau | Desconto |
|---|---|---|---|
| 09/10 | 67 | 60 | 15% |
| 16/10 | 60 | 60 | 15% (último dia) |
| 17/10 | 59 | 30 | 10% |
| 08/12 | 7 | 7 | 5% |
| 09/12 | 6 | — | 0% |

"Preço válido até" na vitrine = `previsao − dias_antes` do degrau vigente.

### D3. Preço da reserva e arredondamento

```
base_cents  = cents(preco_faixa(produto, qtd, produtos.valor))
preco_cents = round_half_up(base_cents * (100 - desconto_pct) / 100)
preco       = least(preco_cents / 100, produtos.valor)
```

- Em SQL: `numeric`, `round(x, 0)` (meio para longe do zero, igual a half-up para positivos).
- Em TS: inteiro em centavos e `Math.round` sobre `base_cents * (100 - pct) / 100`, que é
  exato porque `pct` é inteiro e `base_cents` é inteiro (o produto é inteiro; a divisão por
  100 dá no máximo duas casas, e `x.5` exato arredonda para cima como no SQL).
- Fixtures obrigatórias (mesmas no teste TS e no teste SQL em `begin … rollback`):

| Faixa | Desconto | Esperado |
|---|---|---|
| 15,90 | 15% | 13,52 (1590×85/100 = 1351,5 → 1352) |
| 15,40 | 15% | 13,09 |
| 14,90 | 15% | 12,67 (1266,5 → 1267) |
| 15,90 | 10% | 14,31 |
| 14,90 | 5% | 14,16 (1415,5 → 1416) |

Desconto por volume **soma** com a curva (decisão da dona); a forma multiplicativa é
premissa do PRD.

Lote **sem curva** (`curva = '[]'`): preço = `coalesce(valor, produtos.valor)`, sem faixa de
volume. É o comportamento atual e protege os lotes publicados (US08).

### D4. Uma fonte da verdade

- SQL: `public.venda_futura_preco(p_vf uuid, p_qtd int, p_data date default (now() at time
  zone 'America/Manaus')::date) returns numeric`, `stable`, `security definer`, `search_path`
  fixo. O checkout chama essa função.
- TS: `src/lib/venda-futura/preco-curva.ts` — `degrauVigente`, `precoReserva`,
  `matrizSimulacao`. Réplica pura (padrão de `preco-faixa.ts`) com `preco-curva.test.ts`
  usando as fixtures de D3. Comentário `ponytail:` dizendo que a regra vive no SQL.
- O simulador nunca grava preço; a vitrine mostra o valor calculado pelo TS a partir dos
  mesmos dados, e o checkout/RPC recalcula no SQL.

### D5. Checkout (Milestone 1)

Nos dois laços de `checkout_criar_pedido` (validação e gravação), trocar
`coalesce(v_vf.valor, v_prod.valor)` por `venda_futura_preco(v_vf_id, v_qtd)`. Para lote sem
curva a função devolve o mesmo valor de hoje. Lote **com mínimo** é recusado no checkout com
mensagem "Este lote é reservado sem pagamento: use Reservar" (ele usa D7).

Migration nova recria a função a partir da versão vigente (0207), não de uma base antiga —
foi exatamente esse erro que a 0213 corrigiu na coletiva.

### D6. Simulador (Milestone 1)

No `VendaFuturaForm`, depois de produto, produção prevista, entrega e degraus:

- Busca as faixas do produto (`promocoes_progressivas`) e `comissao_pct_produto(produto)`
  via server action (a função já tem grant para `authenticated`). Falha → 5% e aviso
  "estimativa".
- `matrizSimulacao({ base, faixas, curva })` devolve linhas (1 un., e cada `min_qtd` das
  faixas) × colunas (cada degrau): preço, desconto total `1 − preco/base`, líquido
  `preco × (1 − comissao)`.
- Receita do lote: mínima = produção × menor preço da matriz; máxima = produção × maior preço
  com desconto (degrau de menor desconto, sem faixa). Mostrar também líquido.
- Aviso de margem quando o desconto total de qualquer célula passar de 30% (premissa).
- Recalcula no cliente a cada alteração (sem rede depois do primeiro carregamento), para
  ficar abaixo de 1 s.

### D7. Reserva sem cobrança (Milestone 2)

Colunas no lote: `minimo_reservas int` (null = sem mínimo), `prazo_minimo date`,
`status_lote text` (`Aberto` | `Garantido` | `Cancelado`, default `Aberto`).

Tabela `venda_futura_reservas` (RLS ligado; leitura do próprio comprador e do dono da loja;
escrita só por RPC): lote, comprador, quantidade, `preco_unit` travado, `desconto_pct` e
`faixa_min_qtd` aplicados, `status` (`Reservada` | `Convertida` | `Cancelada` |
`Expirada`), `pedido_id`, timestamps.

RPC `venda_futura_reservar(p_vf, p_qtd)`:
1. Gate CNPJ/IE (mesma regra do checkout), quantidade mínima do produto, saldo do lote.
2. Calcula `venda_futura_preco(p_vf, p_qtd)` e grava a reserva com o preço travado.
3. Baixa `vendas_futuras.estoque` (o saldo continua sendo o disponível).
4. Se o lote está `Aberto` e `sum(qtd)` das reservas `Reservada` ≥ `minimo_reservas`:
   marca `Garantido` e chama `venda_futura_converter(p_vf)`.
5. Se o lote já está `Garantido`: converte esta reserva na hora.

`venda_futura_converter(p_vf)`: para cada reserva `Reservada`, cria um pedido "Aguardando
Pagamento" com uma `linha_itens` (`venda_futura_id`, `valor = preco_unit`), comissão por
`comissao_pct_produto`, e `pagamento_ate = now() + 48 h`. Reaproveitar a montagem de pedido
da coletiva (`coletiva_fechar`, 0189) em vez de escrever outra. A cobrança Asaas é gerada
quando o comprador abre "Pagar meu pedido", como na coletiva.

### D8. Prazos (Milestone 2)

No tick diário existente da venda futura:
- `prazo_minimo < hoje` e lote `Aberto` → `Cancelado`, reservas `Cancelada`, devolve saldo,
  avisos.
- Pedido de venda futura não pago com `pagamento_ate < now()` → cancela, reserva `Expirada`,
  devolve quantidade ao lote.

**Decidido (dona, 09/10):** aceitar o atraso de até 24 h; sem cron novo.

### D9. Vitrine

`MercadoFuturo` passa a ler `curva`, `minimo_reservas`, `prazo_minimo`, `status_lote` e a
soma reservada. Card: preço à vista riscado, preço do degrau atual (na quantidade mínima),
selo "X% abaixo do à vista", "Preço válido até DD/MM · depois R$ Y"; com mínimo: barra
"N de M un. reservadas", "mínimo até DD/MM", "Você só paga se o lote atingir o mínimo", e o
botão chama a RPC de D7 em vez do carrinho. "A partir de" = degrau atual × maior faixa.

## Risks / Trade-offs

- Volume + curva derrubam margem → simulador mostra líquido e alerta de 30%.
- Divergência TS × SQL → fixtures iguais nos dois testes; checklist de aceite compara
  simulador e pedido real.
- Expiração de 48 h atrasada pelo cron diário → ver D8.
- Asaas de produção estava em sandbox em 01/10 → conferir antes do Milestone 2.

## Migration Plan

1. Rodar `scripts/proximo-migration.sh` para os números (repetir com `--checar` antes do
   push). Próxima livre em 06/10 era 0218, mas confirme.
2. M1: colunas `curva`/`producao_prevista` + trigger de validação + `venda_futura_preco` +
   `checkout_criar_pedido` recriado a partir da 0207.
3. M2: colunas de mínimo/status + `venda_futura_reservas` + RPCs + ajustes do tick.
4. Cada migration testada em `begin … select … rollback` com `supabase db query --linked`
   antes de aplicar; conferir no schema real depois.
5. Rollback: lote sem curva e sem mínimo é o comportamento atual; reverter é recriar o
   checkout da 0207.

## Open Questions

Nenhuma: premissas e atraso do cron confirmados pela dona em 09/10/2026.
