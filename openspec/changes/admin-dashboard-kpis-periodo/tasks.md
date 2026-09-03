## 1. Fundação (funções puras + testes)

- [ ] 1.1 `src/lib/admin/dashboard-kpis.ts`: `resolverJanela(range)` → `{ desde, ate, desdeAnterior, ateAnterior, comparavel }` para `30d | 90d | mes | tudo` (default `30d`)
- [ ] 1.2 Mesmas funções puras de agregação: `ticketMedio(gmv, nPedidos)`, `taxaConversao(pedidos)`, `delta(atual, anterior)` → `{ pct, direcao: 'up'|'down'|'flat' } | null`
- [ ] 1.3 `src/lib/admin/dashboard-kpis.test.ts` (Red → Green): bordas de `resolverJanela` (mês, tudo sem comparativo), divisão por zero em ticket médio / taxa, `delta` com anterior 0

## 2. UI

- [ ] 2.1 `src/components/admin/PeriodoTabs.tsx`: abas server-side (`<Link href="/admin?range=...">`), destaque do ativo, preserva `?p=` da paginação
- [ ] 2.2 `KpiCard` em `src/components/painel/ui.tsx`: prop opcional `delta?: ReactNode` renderizado abaixo do valor; sem `delta` = comportamento atual intacto
- [ ] 2.3 Selo de delta (seta + %) verde/vermelho/neutro, com `aria-label` ("subiu 12% vs. período anterior")

## 3. Dashboard

- [ ] 3.1 `admin/page.tsx`: ler `range` de `searchParams`, trocar `monthStartISO()` por `resolverJanela(range)`
- [ ] 3.2 Buscar pedidos + linha_itens da janela (mantém `fetchAll`/`chunk`); buscar agregados da janela anterior quando `comparavel`
- [ ] 3.3 Cards existentes (Valor, Produtos vendidos, Receita, Pedidos) + `delta` — base "todos os pedidos" mantida
- [ ] 3.4 Cards novos: Ticket médio, Taxa de conversão de pagamento, GMV a receber
- [ ] 3.5 Card Devoluções: `disputas` com `decisao IN ('reembolso_total','reembolso_parcial')` e `decidida_em` na janela → nº + Σ `decisao_valor`
- [ ] 3.6 Card Novos leads (CRM): `leads` com `created_at` na janela; link para `/admin/leads`
- [ ] 3.7 Ajustar rótulos "do mês" → "do período" e o `EmptyState` da tabela ("Nenhuma venda no período selecionado")
- [ ] 3.8 "Fila de curadoria" inalterada

## 4. Verificação

- [ ] 4.1 Confirmar via `supabase db query --linked` que `disputas` e `leads` têm policy de leitura para `is_admin` (senão os cards vêm zerados por RLS, não por ausência de dado)
- [ ] 4.2 `npm run test` — novos testes verdes, suíte existente intacta
- [ ] 4.3 `node_modules/.bin/tsc --noEmit` limpo
- [ ] 4.4 `npm run lint` sem erro novo
- [ ] 4.5 `npm run build` limpo
- [ ] 4.6 QA em preview: `?range=90d` mostra os 212 pedidos / R$ 77,6k pagos + R$ 83,7k a receber; `?range=30d` (default) e `?range=tudo` (sem comparativo) coerentes; paginação preserva `range`
- [ ] 4.7 Abrir branch + PR referenciando a Issue (`Closes #486`)

## 5. Fechamento

- [ ] 5.1 `openspec archive admin-dashboard-kpis-periodo` após merge
- [ ] 5.2 Atualizar memória do projeto com o estado final
