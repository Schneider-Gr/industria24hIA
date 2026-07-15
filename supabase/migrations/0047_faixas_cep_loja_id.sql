-- 0043: cobertura de entrega por LOJA (decisão do dono, 2026-07-14).
-- faixas_cep era global (mesma área pra todo o marketplace); cada loja pode
-- ter sua própria faixa. loja_id NULL = fallback global (as 13 faixas
-- existentes continuam valendo pra qualquer loja sem override específico).

alter table public.faixas_cep
  add column if not exists loja_id uuid references public.lojas(id) on delete cascade;

create index if not exists faixas_cep_loja_id_idx on public.faixas_cep(loja_id);
