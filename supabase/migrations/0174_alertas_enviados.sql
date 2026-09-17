-- 0174: registro de alertas já disparados, para cron não repetir aviso.
--
-- Dois cron novos precisam da mesma garantia e nenhum dos dois tem onde
-- marcar "já avisei":
--   - ruptura de estoque (diário, por loja/produto) — não pode virar spam
--     enquanto o seller não repõe;
--   - venda futura (aviso no dia e às vésperas da retirada) — não pode
--     disparar duas vezes se o cron rodar de novo no mesmo dia.
--
-- ponytail: uma chave de texto por alerta em vez de uma coluna nova em cada
-- tabela de domínio. A chave carrega o que identifica o evento
-- (`estoque:<produto_id>:<estado>`, `venda_futura:<linha_item_id>:<marco>`) e
-- quem apaga a linha é o próprio cron quando o estado muda.
create table if not exists public.alertas_enviados (
  chave text primary key,
  enviado_em timestamptz not null default now()
);

comment on table public.alertas_enviados is
  'Idempotência dos cron de alerta (ruptura de estoque, venda futura). Chave = evento único já notificado.';

alter table public.alertas_enviados enable row level security;

-- Sem policy: leitura e escrita só pelo service role dos cron (deny-by-default,
-- regra 6 do CLAUDE.md). Nenhum papel de usuário precisa ler isto.

create index if not exists idx_alertas_enviados_enviado_em
  on public.alertas_enviados (enviado_em);
