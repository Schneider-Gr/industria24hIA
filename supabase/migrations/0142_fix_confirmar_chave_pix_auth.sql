-- Fix crítico: confirmar_chave_pix e confirmar_chave_pix_afiliado tinham a
-- checagem invertida — "auth.uid() is null" foi usado como proxy pra
-- "chamada vem do backend/service_role", mas auth.uid() TAMBÉM é null pra
-- qualquer chamada anônima via PostgREST (role anon, sem JWT de usuário).
-- Como as duas funções tinham GRANT EXECUTE pra anon, qualquer visitante sem
-- login conseguia confirmar a chave PIX de qualquer loja/afiliado batendo
-- direto no endpoint /rest/v1/rpc/<funcao> com a anon key — pulando a
-- carência de confirmação (chave_pix_confirmada_em) que existe justamente
-- pra evitar fraude de redirecionamento de repasse.
--
-- Fix: troca a checagem por auth.role() = 'service_role' (JWT real do
-- backend) ou public.is_admin(), e revoga o EXECUTE de anon nas duas.

create or replace function public.confirmar_chave_pix(p_loja_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not (auth.role() = 'service_role' or public.is_admin()) then
    raise exception 'Apenas admin ou service_role confirmam chave PIX.';
  end if;
  update lojas set chave_pix_confirmada_em = now() where id = p_loja_id;
end;
$function$;

create or replace function public.confirmar_chave_pix_afiliado(p_afiliado_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not (auth.role() = 'service_role' or public.is_admin()) then
    raise exception 'Apenas admin ou service_role confirmam chave PIX.';
  end if;
  update public.afiliado_dados_pix set chave_pix_confirmada_em = now() where afiliado_id = p_afiliado_id;
end;
$function$;

revoke execute on function public.confirmar_chave_pix(uuid) from anon;
revoke execute on function public.confirmar_chave_pix_afiliado(uuid) from anon;
