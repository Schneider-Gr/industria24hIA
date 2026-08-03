-- Carrinho abandonado no painel do seller: carrinhos_abandonados só tem
-- policy de RLS pro dono (comprador, ver 0094), então o seller não
-- enxerga carrinho de outro usuário mesmo tendo item da própria loja
-- ali dentro. Função SECURITY DEFINER filtra pela loja do dono
-- autenticado (owner_id = auth.uid()) e devolve só os itens daquela
-- loja (carrinho pode ter itens de várias lojas, ver carrinho.tsx),
-- mais o cálculo de "convertido": pedido da mesma loja/comprador criado
-- depois do lembrete (ou da última atualização, se lembrete não foi
-- enviado ainda).
create or replace function public.seller_carrinhos_abandonados()
returns table (
  user_id uuid,
  email text,
  itens jsonb,
  atualizado_em timestamptz,
  lembrete_enviado_em timestamptz,
  convertido boolean
)
language sql
security definer
set search_path = public
stable
as $$
  with minha_loja as (
    select id from lojas where owner_id = auth.uid() limit 1
  )
  select
    ca.user_id,
    ca.email,
    (
      select jsonb_agg(item)
      from jsonb_array_elements(ca.itens) item
      where (item ->> 'loja_id')::uuid = (select id from minha_loja)
    ) as itens,
    ca.atualizado_em,
    ca.lembrete_enviado_em,
    exists (
      select 1 from pedidos p
      where p.cliente_id = ca.user_id
        and p.loja_id = (select id from minha_loja)
        and p.created_at > coalesce(ca.lembrete_enviado_em, ca.atualizado_em)
    ) as convertido
  from carrinhos_abandonados ca
  where exists (select 1 from minha_loja)
    and exists (
      select 1 from jsonb_array_elements(ca.itens) item
      where (item ->> 'loja_id')::uuid = (select id from minha_loja)
    )
  order by ca.atualizado_em desc;
$$;

grant execute on function public.seller_carrinhos_abandonados() to authenticated;
