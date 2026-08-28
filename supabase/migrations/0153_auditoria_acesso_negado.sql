-- 0153: audita tentativa de acesso a painel sem o papel exigido.
-- Chamado pelos layout.tsx de admin/seller/afiliado/parceiro imediatamente
-- antes do redirect de papel (não do redirect de "sem sessão").
-- security definer: auditoria_eventos (0034) não tem policy de insert para
-- authenticated — só triggers e service_role escrevem lá.

create or replace function public.registrar_acesso_negado(p_rota text, p_papel text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Sem sessão não é "acesso negado por papel" — é o gate de login.
  if auth.uid() is null then
    return;
  end if;

  insert into public.auditoria_eventos
    (ator_id, ator_papel, acao, tabela, registro_id, dados_depois)
  values (
    auth.uid(),
    'authenticated',
    'acesso.negado',
    'auth.users',
    auth.uid(),
    jsonb_build_object('rota', p_rota, 'papel_esperado', p_papel)
  );
end;
$$;

revoke all on function public.registrar_acesso_negado(text, text) from public, anon;
grant execute on function public.registrar_acesso_negado(text, text) to authenticated;
