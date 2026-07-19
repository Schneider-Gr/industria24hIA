-- Fix: o carimbo do aceite dos Termos do Mercado Futuro (0061) era gravado no
-- pedido via service client na server action, condicionado a isServiceConfigured
-- — que está DESLIGADO em produção (mesma razão da cobrança Asaas não gravar
-- desde ~06/07). Resultado: pedidos de venda futura ficavam com termos_aceitos_em
-- NULL, sem prova de aceite. As policies de `pedidos` só permitem seller/admin,
-- não o comprador, então o user client também não grava.
--
-- Correção: RPC SECURITY DEFINER que grava o carimbo (roda como owner, dispensa
-- service role e RLS). Chamada pela server action com o client autenticado do
-- comprador logo após criar o pedido. Idempotente e restrita ao dono do pedido.

create or replace function public.carimbar_aceite_mf(p_pedido_id uuid)
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
  from paginas_cms where slug = 'termos-mercado-futuro';

  -- só carimba o próprio pedido e uma única vez (idempotente). termos_* não são
  -- campos financeiros, então o trigger guard_campos_restritos permite o update.
  update pedidos
     set termos_aceitos_em = now(),
         termos_versao     = coalesce(v_versao, now()::text)
   where id = p_pedido_id
     and cliente_id = auth.uid()
     and termos_aceitos_em is null;
end;
$$;

revoke all on function public.carimbar_aceite_mf(uuid) from public;
grant execute on function public.carimbar_aceite_mf(uuid) to authenticated;
