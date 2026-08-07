-- 0113: corrige iniciarConversa (chat comprador↔loja, MPDD-15/0075) quebrada
-- para QUALQUER comprador desde a 0012 (hardening 21/07). A 0012 derrubou a
-- policy `lojas_public_read` (vazava chave_pix/cnpj/e-mail/endereço) e a
-- substituiu pela view `lojas_vitrine` — mas `iniciarConversa`
-- (src/app/mensagens/actions.ts) continuou lendo a TABELA `lojas` direto
-- (`select id, owner_id ... eq id`), e a tabela hoje só é legível pelo dono
-- ou admin (lojas_owner_all/lojas_admin_all). Resultado: para qualquer
-- comprador que não é o dono da loja — ou seja, sempre, no uso real da
-- feature — a query nunca retorna linha, e a action lança "Loja não
-- encontrada." Achado testando /pedido/[id] → "Falar com o vendedor" com a
-- conta de teste comprador-teste-i24@example.com (mesmo bug já existia no
-- botão de mesmo nome em /produto/[id], que usa a mesma action).
--
-- Fix: RPC SECURITY DEFINER que responde só existência + é-dono, sem expor
-- nenhuma coluna sensível (nada de chave_pix/cnpj/e-mail/endereço) — não
-- reabre o que a 0012 fechou, só destrava a checagem que iniciarConversa
-- sempre precisou fazer.
create or replace function public.loja_existe_e_e_dono(p_loja_id uuid)
returns table(existe boolean, eh_dono boolean)
language sql
security definer
set search_path = public
stable
as $$
  select true, (l.owner_id = auth.uid())
  from public.lojas l
  where l.id = p_loja_id;
$$;

revoke all on function public.loja_existe_e_e_dono(uuid) from public;
grant execute on function public.loja_existe_e_e_dono(uuid) to authenticated;
