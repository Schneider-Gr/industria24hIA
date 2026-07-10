-- Garante no máximo 1 promoção ativa por produto (evita .maybeSingle() quebrar
-- a vitrine quando o seller cadastra uma 2ª faixa como nova linha).
create unique index if not exists promocoes_progressivas_produto_ativo_uidx
  on promocoes_progressivas (produto_id)
  where ativo;
