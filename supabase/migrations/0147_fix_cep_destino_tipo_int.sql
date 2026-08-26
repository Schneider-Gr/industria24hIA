-- 0147: corrige transportadora_faixas_frete.cep_destino_* para integer, na
-- mesma convenção de faixas_cep.cep_inicial/cep_final (0014) — a 0145 criou
-- como text por engano. Tabela recém-criada, sem dado real (só o teste em
-- rollback), então a conversão é direta.

alter table public.transportadora_faixas_frete
  drop constraint if exists transportadora_faixas_frete_cep_destino_inicial_cep_destino_check;

alter table public.transportadora_faixas_frete
  alter column cep_destino_inicial type integer using cep_destino_inicial::integer,
  alter column cep_destino_final type integer using cep_destino_final::integer;

alter table public.transportadora_faixas_frete
  add constraint transportadora_faixas_frete_cep_check
  check (cep_destino_inicial <= cep_destino_final);
