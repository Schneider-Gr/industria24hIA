-- CHECK de domínio para lojas.situacao e faixas_cep.percentual (achado LOW
-- 07/07): situacao era texto livre (variantes como 'ativa' escapavam do
-- filtro situacao='Ativa' da view/policies) e percentual aceitava
-- negativo/>100.

alter table public.lojas
  add constraint lojas_situacao_check check (situacao in ('Ativa', 'Inativa'));

alter table public.faixas_cep
  add constraint faixas_cep_percentual_check check (percentual >= 0 and percentual <= 100);
