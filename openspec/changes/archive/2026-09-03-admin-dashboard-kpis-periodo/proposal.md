## Why

O dashboard do admin (`src/app/(admin)/admin/page.tsx`) é travado no **mês corrente** (`monthStartISO()` → `data >= date_trunc('month', now())`). Validação no banco de produção (2026-09-03):

- `pedidos`: 316 no total, janela real **2025-06-20 → 2026-08-25**. **Zero em setembro/2026.**
- Resultado: todos os cards financeiros ("Valor do mês", "Produtos vendidos", "Receita da plataforma", "Pedidos no mês"), a tabela "Vendas do mês" e "Top lojas do mês" aparecem zerados/vazios — não por bug de query, mas porque não há pedido no mês corrente.
- Últimos 90 dias têm 212 pedidos (141 "Pagamento Realizado" = R$ 77,6k GMV, 171 "Aguardando Pagamento" = R$ 83,7k), 303 linhas de item (Σ `repasse_ind` = R$ 7.991,25; Σ `quantidade` = 38.417).

O admin não tem como olhar o histórico sem editar a URL, e um mês sem vendas deixa o painel inteiro cego. Faltam ainda métricas que o time comercial pediu: ticket médio, taxa de conversão de pagamento, comparativo com o período anterior, GMV a receber, devoluções e novos leads do CRM.

## What Changes

- **Seletor de período** no topo do dashboard: `?range=30d | 90d | mes | tudo`, default **30d**. Um componente de abas (links server-side, sem client state). Todos os KPIs, a tabela de vendas e o Top lojas passam a respeitar a janela selecionada.
- **Base de cálculo mantida**: GMV / Receita / Produtos vendidos continuam somando **todos os pedidos** da janela, independente de status de pagamento (decisão do dono, 2026-09-03). Nenhuma mudança na semântica dos cards existentes além da janela.
- **Comparativo vs. período anterior**: cada card financeiro ganha um selo `▲/▼ %` contra a janela imediatamente anterior de mesma duração (30d vs. 30d anteriores; `mes` vs. mês passado; `tudo` sem comparativo). `KpiCard` (`src/components/painel/ui.tsx`) ganha um prop opcional `delta?: ReactNode` — aditivo, não quebra os ~47 call sites.
- **Novos KPIs**:
  - **Ticket médio** — GMV da janela ÷ nº de pedidos da janela.
  - **Taxa de conversão de pagamento** — % de pedidos da janela com `status_pedido = 'Pagamento Realizado'`.
  - **GMV a receber** — Σ `valor_pedido` dos pedidos `status_pedido = 'Aguardando Pagamento'` na janela.
  - **Devoluções** — nº de `disputas` com `decisao IN ('reembolso_total','reembolso_parcial')` e `decidida_em` na janela + Σ `decisao_valor`.
  - **Novos leads (CRM)** — nº de `leads` com `created_at` na janela.
  - **Repasses realizados** — Σ `repasses.valor` com `status = 'transferido'` e `transferido_em` na janela + Δ.
- **Drill-down por KPI** (2ª rodada): cada card financeiro do dashboard do admin vira link para `/admin/pedidos` já filtrado pela mesma janela (`?range=`) e, quando o KPI é sobre um recorte de pagamento, pelo `?status=` (GMV a receber → `Aguardando Pagamento`, Conversão → `Pagamento Realizado`). `/admin/pedidos` passa a aceitar `range` + `status`, com barra de filtro e subtítulo dinâmico. O card "Repasses realizados" abre `/admin/repasses?range=…&status=transferido`.
- **`/admin/repasses` turbinado** (2ª rodada): seletor de período (`PeriodoTabs`), 5 cards de resumo por status (Realizados / Pendentes / Falharam / Inelegíveis / Estornados) com valor + contagem na janela, coluna "Transferido em" e filtro de status. Antes era só lista com cap de 300 e sem soma.
- **Dashboard do seller** (2ª rodada): mesmo seletor de período; "Resultado" vira grade de `KpiCard` com Faturamento, Pedidos, Ticket médio (+Δ), Produtos vendidos, Conversão de pagamento, A receber e "Repasse sobre vendas pagas" (Σ `linha_itens.repasse_vendedor` dos itens cujo pedido está `Pagamento Realizado` na janela — de `linha_itens`, que a RLS de dono da loja já cobre; o ledger `repasses` só é legível pelo admin hoje). Recorte `mês atual` mantém o fuso de Manaus; recortes rolantes usam a janela padrão. Gráficos (vendas por dia, categoria, top produtos) passam a seguir a janela.
- **`/admin/analise-geral` consolidado por loja** (2ª rodada): seletor de período + tabela com uma linha por loja com movimento (pedidos, GMV, ticket médio, conversão, unidades vendidas, receita da plataforma, repasses realizados) + linha de total. 4 KPIs de topo (lojas cadastradas, produtos, GMV do período, repasses realizados).
- **Componentes compartilhados**: `PeriodoTabs` e `DeltaBadge` movidos para `src/components/painel/` e ganham `basePath`; `src/lib/admin/dashboard-kpis.ts` → `src/lib/dashboard-kpis.ts` (usado por admin e seller) + `resumoRepassesPorStatus`.
- **Sem nova migration, sem mudança de schema, sem mudança de RLS.** Toda leitura nova usa tabelas/policies já existentes: `disputas`, `leads` e `repasses` têm `is_admin` (dashboard e analise-geral são telas de admin); o card do seller vem de `linha_itens` (`linha_itens_owner_all`), não de `repasses`.

## Non-goals

- Não muda a base de GMV/Receita para "só pagos" (avaliado e recusado nesta rodada).
- Não adiciona persistência/cache do dashboard nem gráfico de série temporal — só os cards e as duas tabelas existentes.
- Não cria tela de "cadastro de loja pelo admin" (tema separado).
- Não mexe no bloco "Fila de curadoria" (lojas em análise / produtos a aprovar / afiliações / entregas em trânsito) — permanece sempre no estado atual, sem janela.

## Capabilities

### New Capabilities
- `admin-dashboard-kpis`: visão gerencial do marketplace no painel do admin, com período selecionável e comparativo.

## Impact

- `src/app/(admin)/admin/page.tsx` — reescrita da seção de KPIs + tabelas para respeitar `range`; duas leituras extras por request (`disputas`, `leads`) + uma leitura agregada da janela anterior para o comparativo.
- `src/components/painel/ui.tsx` — `KpiCard` ganha `delta?: ReactNode` opcional.
- `src/components/admin/PeriodoTabs.tsx` (novo) — abas de período.
- `src/lib/admin/dashboard-kpis.ts` (novo) + `.test.ts` — funções puras: resolução de janela a partir de `range`, agregações (ticket médio, taxa de conversão, deltas). Regra de negócio testável fora do componente, conforme convenção do projeto.
- Trade-off: mais round-trips por request no dashboard (aceitável — rota autenticada de baixo volume, já `force-dynamic`).
