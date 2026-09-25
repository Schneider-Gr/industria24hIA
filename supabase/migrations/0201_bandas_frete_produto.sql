-- 0201: três bandas de frete por produto (moto, carro, caminhão).
--
-- Decisão da dona, 25/09/2026: no botão avião, o seller simula quantidades
-- e define, por produto, a tarifa mínima e o R$/km de cada veículo. Frete =
-- maior entre a tarifa mínima e km (só ida) × R$/km da banda do veículo que
-- o peso exige (moto ≤ 20 kg, carro ≤ 300 kg, caminhão acima), + porto e
-- ajudantes. Substitui a decisão 8 do PRD 054 (custo declarado pelo parceiro)
-- e o R$/km único + piso por loja da 0193 (PRD 053).
--
-- Piso por km fixo por veículo (PRD 054): R$ 6 / 8 / 20, garantido aqui por
-- check, então nem a API direta grava abaixo. Tarifa mínima sem padrão (dona):
-- NULL = sem tarifa mínima; R$/km NULL = banda não definida.
--
-- produtos.valor_km_afiliado (0193) fica como está: nada o lê fora do avião
-- antigo, e o checkout por km (PRD 053 US02) ainda não existe. Em prod, em
-- 25/09, só 1 produto (o de teste) tinha valor.

alter table public.produtos
  add column if not exists tarifa_minima_moto     numeric(12,2) check (tarifa_minima_moto >= 0),
  add column if not exists valor_km_moto          numeric(12,2) check (valor_km_moto >= 6),
  add column if not exists tarifa_minima_carro    numeric(12,2) check (tarifa_minima_carro >= 0),
  add column if not exists valor_km_carro         numeric(12,2) check (valor_km_carro >= 8),
  add column if not exists tarifa_minima_caminhao numeric(12,2) check (tarifa_minima_caminhao >= 0),
  add column if not exists valor_km_caminhao      numeric(12,2) check (valor_km_caminhao >= 20);
