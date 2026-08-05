-- RPC para carimbar o aceite dos Termos de Produtos Perecíveis no pedido
-- (PRD 010 US02), mesmo padrão de carimbar_aceite_mf (0062): SECURITY
-- DEFINER porque as policies de `pedidos` não dão UPDATE ao comprador.

create or replace function public.carimbar_aceite_pereciveis(p_pedido_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_versao text;
begin
  if auth.uid() is null then
    raise exception 'Faça login.';
  end if;

  select atualizado_em::text into v_versao
  from paginas_cms where slug = 'termos-produtos-pereciveis';

  update pedidos
     set aceite_termos_pereciveis_em = now(),
         aceite_termos_pereciveis_versao = coalesce(v_versao, now()::text)
   where id = p_pedido_id
     and cliente_id = auth.uid()
     and aceite_termos_pereciveis_em is null;
end;
$$;

revoke all on function public.carimbar_aceite_pereciveis(uuid) from public;
grant execute on function public.carimbar_aceite_pereciveis(uuid) to authenticated;
