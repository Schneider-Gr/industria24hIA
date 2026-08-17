-- Corrige exposição de PII: a policy publica coletivas_public_read (qual=true)
-- liberava select("*") na tabela inteira, incluindo endereco de entrega do
-- comprador (entrega_cep/rua/numero/bairro/cidade/complemento) para qualquer
-- usuario anonimo. RLS e row-level e nao esconde colunas dentro da mesma
-- policy, entao a correcao e via GRANT de colunas: anon/authenticated so
-- enxergam os campos publicos do card de compra coletiva; entrega_* fica
-- restrito ao service_role (que ja escreve esses campos via server action).
revoke select on public.compras_coletivas from anon, authenticated;

grant select (
  id,
  produto_id,
  loja_id,
  criador_id,
  meta_qtd,
  valor_unitario,
  preco_base,
  qtd_atual,
  prazo,
  status,
  created_at,
  regra_id,
  lotes,
  min_participantes,
  max_participantes,
  frete_conjunto,
  fechada_em,
  pagamento_ate
) on public.compras_coletivas to anon, authenticated;
