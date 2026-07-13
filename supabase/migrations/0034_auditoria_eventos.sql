-- 0034: trilha de auditoria. Não existia nenhuma tabela de log no schema —
-- achado da avaliação de segurança do repasse/chave PIX (docs/compliance.md,
-- docs/e5-seller-onboarding-b2b-auditoria.md). Cobre desde o dia 1 os eventos
-- financeiros/identidade mais sensíveis: mudança de situação da loja
-- (aprovação/suspensão), moderação de produto, e "transferido" virando true
-- (repasse). A mudança de chave PIX é logada pela própria RPC dedicada em
-- 0035 (não por trigger genérico aqui, porque a RPC já tem o contexto
-- completo de ator/antes/depois sem precisar reconsultar).

create table public.auditoria_eventos (
  id           uuid primary key default gen_random_uuid(),
  ator_id      uuid references auth.users (id) on delete set null,
  ator_papel   text not null default 'desconhecido',
  acao         text not null,
  tabela       text not null,
  registro_id  uuid,
  dados_antes  jsonb,
  dados_depois jsonb,
  criado_em    timestamptz not null default now()
);

alter table public.auditoria_eventos enable row level security;

-- Leitura só admin (é trilha de auditoria, não painel do seller).
create policy auditoria_eventos_admin_read on public.auditoria_eventos
  for select using (public.is_admin());

-- Escrita: nunca pelo client. Só triggers (security definer, bypassam RLS
-- por padrão) ou service_role. Nenhuma policy de insert para authenticated.

create or replace function public.registrar_auditoria_generico()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ator_papel text := case when auth.uid() is null then 'service_role' else 'authenticated' end;
begin
  -- Um if externo por tabela: acessar new.<campo> de outra tabela dentro de
  -- um "and" quebra em runtime (Postgres não garante short-circuit).
  if tg_table_name = 'lojas' then
    if new.situacao is distinct from old.situacao then
      insert into auditoria_eventos (ator_id, ator_papel, acao, tabela, registro_id, dados_antes, dados_depois)
      values (auth.uid(), v_ator_papel, 'loja.situacao_alterada', 'lojas', new.id,
              jsonb_build_object('situacao', old.situacao),
              jsonb_build_object('situacao', new.situacao));
    end if;

  elsif tg_table_name = 'produtos' then
    if new.status_produto is distinct from old.status_produto then
      insert into auditoria_eventos (ator_id, ator_papel, acao, tabela, registro_id, dados_antes, dados_depois)
      values (auth.uid(), v_ator_papel, 'produto.status_alterado', 'produtos', new.id,
              jsonb_build_object('status_produto', old.status_produto),
              jsonb_build_object('status_produto', new.status_produto));
    end if;

  elsif tg_table_name = 'linha_itens' then
    if new.transferido is distinct from old.transferido then
      insert into auditoria_eventos (ator_id, ator_papel, acao, tabela, registro_id, dados_antes, dados_depois)
      values (auth.uid(), v_ator_papel, 'linha_item.transferido_alterado', 'linha_itens', new.id,
              jsonb_build_object('transferido', old.transferido),
              jsonb_build_object('transferido', new.transferido, 'pedido_id', new.pedido_id));
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists auditoria_lojas on public.lojas;
create trigger auditoria_lojas
  after update on public.lojas
  for each row execute function public.registrar_auditoria_generico();

drop trigger if exists auditoria_produtos on public.produtos;
create trigger auditoria_produtos
  after update on public.produtos
  for each row execute function public.registrar_auditoria_generico();

drop trigger if exists auditoria_linha_itens on public.linha_itens;
create trigger auditoria_linha_itens
  after update on public.linha_itens
  for each row execute function public.registrar_auditoria_generico();
