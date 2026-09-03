## 1. Fundação (funções puras + testes)

- [x] 1.1 `src/lib/admin/dashboard-kpis.ts`: `resolverJanela(range)` → `{ desde, ate, desdeAnterior, ateAnterior, comparavel }` para `30d | 90d | mes | tudo` (default `30d`)
- [x] 1.2 Mesmas funções puras de agregação: `ticketMedio(gmv, nPedidos)`, `taxaConversao(pedidos)`, `delta(atual, anterior)` → `{ pct, direcao: 'up'|'down'|'flat' } | null`
- [x] 1.3 `src/lib/admin/dashboard-kpis.test.ts` (Red → Green): bordas de `resolverJanela` (mês, tudo sem comparativo), divisão por zero em ticket médio / taxa, `delta` com anterior 0

## 2. UI

- [x] 2.1 `src/components/admin/PeriodoTabs.tsx`: abas server-side (`<Link href="/admin?range=...">`), destaque do ativo, preserva `?p=` da paginação
- [x] 2.2 `KpiCard` em `src/components/painel/ui.tsx`: prop opcional `delta?: ReactNode` renderizado abaixo do valor; sem `delta` = comportamento atual intacto
- [x] 2.3 Selo de delta (seta + %) verde/vermelho/neutro, com `aria-label` ("subiu 12% vs. período anterior")

## 3. Dashboard

- [x] 3.1 `admin/page.tsx`: ler `range` de `searchParams`, trocar `monthStartISO()` por `resolverJanela(range)`
- [x] 3.2 Buscar pedidos + linha_itens da janela (mantém `fetchAll`/`chunk`); buscar agregados da janela anterior quando `comparavel`
- [x] 3.3 Cards existentes (Valor, Produtos vendidos, Receita, Pedidos) + `delta` — base "todos os pedidos" mantida
- [x] 3.4 Cards novos: Ticket médio, Taxa de conversão de pagamento, GMV a receber
- [x] 3.5 Card Devoluções: `disputas` com `decisao IN ('reembolso_total','reembolso_parcial')` e `decidida_em` na janela → nº + Σ `decisao_valor`
- [x] 3.6 Card Novos leads (CRM): `leads` com `created_at` na janela; link para `/admin/leads`
- [x] 3.7 Ajustar rótulos "do mês" → "do período" e o `EmptyState` da tabela ("Nenhuma venda no período selecionado")
- [x] 3.8 "Fila de curadoria" inalterada

## 4. Verificação

- [x] 4.1 Confirmar via `supabase db query --linked` que `disputas` e `leads` têm policy de leitura para `is_admin` (senão os cards vêm zerados por RLS, não por ausência de dado)
- [x] 4.2 `npm run test` — novos testes verdes, suíte existente intacta
- [x] 4.3 `node_modules/.bin/tsc --noEmit` limpo
- [x] 4.4 `npm run lint` sem erro novo
- [x] 4.5 `npm run build` limpo
- [x] 4.6 QA no preview Vercel (dados prod): `?range=90d` → 212 pedidos, GMV R$ 105.668,73, a receber R$ 43.015,61, conversão 51%, ticket R$ 498,44, produtos 21.779, devoluções 0, leads 6 (batem com query direta ao banco); `/admin` = 30d com deltas; `?range=tudo` sem comparativo (316 pedidos, R$ 161.370,27); `?range=mes` zerado com queda de 100%
- [x] 4.7 Abrir branch + PR referenciando a Issue (`Closes #486`)

## 6. 2ª rodada — drill-down, repasses e seller

- [x] 6.1 Mover `dashboard-kpis.ts`/`.test.ts` para `src/lib/`; `PeriodoTabs`/`DeltaBadge` para `src/components/painel/` com `basePath`
- [x] 6.2 `resumoRepassesPorStatus` + teste
- [x] 6.3 `/admin/pedidos` aceita `?range=` e `?status=` (barra de filtro, subtítulo, `PeriodoTabs`)
- [x] 6.4 Dashboard admin: cada KPI financeiro vira `<Link>` para `/admin/pedidos` filtrado; card "Repasses realizados" (Σ `repasses` transferido na janela + Δ) → `/admin/repasses?range&status=transferido`
- [x] 6.5 `/admin/repasses`: `PeriodoTabs` + 5 cards de resumo por status + coluna "Transferido em"
- [x] 6.6 Dashboard seller: `PeriodoTabs`, "Resultado" em `KpiCard`+Δ, novos KPIs (produtos vendidos, conversão, a receber, repasse sobre vendas pagas via `linha_itens.repasse_vendedor`); `mês atual` mantém fuso de Manaus
- [x] 6.7 `/admin/analise-geral`: consolidado por loja (tabela + total) com `PeriodoTabs`
- [x] 6.8 `vitest run` (137, 1 skip), `tsc --noEmit` limpo, `eslint` limpo, `next build` exit 0
- [x] 6.9 QA no preview Vercel (dados prod): drill-down `Valor`/`Receita`/`Ticket`/`Pedidos`/`Produtos` → `/admin/pedidos?range=90d`; `GMV a receber` → `&status=Aguardando Pagamento` (99 registros, soma R$ 43.015,61 = card); `Conversão` → `&status=Pagamento Realizado`; `Repasses realizados` → `/admin/repasses?range=90d&status=transferido`. `/admin/repasses?range=90d`: 5 cards de resumo batem com as 2 linhas de prod. `/admin/analise-geral?range=90d`: 3 lojas, total 212 pedidos / R$ 105.668,73 / ticket R$ 498,44 / 51% = dashboard. Seller `/seller?range=90d`: construção 49 pedidos / R$ 13.477,26 / ticket R$ 275,05 (= analise-geral); A receber R$ 12.254,10; Repasse sobre vendas pagas R$ 1.037,58 (confere com query direta). `range=tudo` sem Δ.
- [x] 6.10 Confirmado sem migration: card do seller lê `linha_itens` (`linha_itens_owner_all`), não `repasses` (só `is_admin`)

## 5. Fechamento

- [ ] 5.1 `openspec archive admin-dashboard-kpis-periodo` após merge
- [x] 5.2 Atualizar memória do projeto com o estado final
