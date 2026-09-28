-- 0204: R$/km do avião sem piso; 6 / 8 / 20 passam a ser a tarifa mínima.
--
-- Correção da dona, 28/09/2026 (vídeo Jam 86b257f6): R$ 6 / 8 / 20 são a TARIFA
-- MÍNIMA de moto / carro / caminhão, não um piso do R$/km. O R$/km é o valor do
-- km rodado, livre (ex.: 0,40 / 1 / 2). Frete = maior entre a tarifa mínima e
-- km × R$/km. A 0201 tinha check R$/km >= 6 / 8 / 20, que barrava o Salvar.
-- A tarifa mínima já vem preenchida com 6 / 8 / 20 na tela e o seller edita.

alter table public.produtos
  drop constraint if exists produtos_valor_km_moto_check,
  drop constraint if exists produtos_valor_km_carro_check,
  drop constraint if exists produtos_valor_km_caminhao_check,
  add constraint produtos_valor_km_moto_check check (valor_km_moto > 0),
  add constraint produtos_valor_km_carro_check check (valor_km_carro > 0),
  add constraint produtos_valor_km_caminhao_check check (valor_km_caminhao > 0);
