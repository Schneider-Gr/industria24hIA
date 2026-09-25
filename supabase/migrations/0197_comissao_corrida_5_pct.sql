-- 0197: comissão da plataforma sobre a corrida passa de 10% para 5%
-- (decisão da dona, 25/09/2026; PRD 055, decisão 2).
--
-- A 0083 fixou o padrão em 10% na coluna; valor_parceiro e comissao_valor são
-- colunas geradas a partir dele, então basta trocar o padrão. Vale só para
-- corridas criadas daqui em diante: as existentes guardam o percentual com que
-- nasceram e não são recalculadas.

alter table public.corridas
  alter column comissao_pct set default 5.00;
