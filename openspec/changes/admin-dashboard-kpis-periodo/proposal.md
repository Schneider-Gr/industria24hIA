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
- **Sem nova migration, sem mudança de schema, sem mudança de RLS.** Toda leitura nova usa tabelas/policies já existentes (`disputas` e `leads` já têm policy `is_admin`; confirmar no item de verificação).

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
