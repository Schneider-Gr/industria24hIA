-- 0212: rastreio em tempo real — quem grava e quem lê `corrida_posicoes`
-- (OpenSpec change entregador-rastreio-zonas-rotas, grupo 1).
--
-- A 0039 só deixava o PARCEIRO logístico gravar posição e só o solicitante e
-- o parceiro ler. Dois buracos:
--   * o afiliado logístico, que recebe a corrida pelo despacho automático
--     (`corridas.afiliado_exclusivo_id`, 0043), não conseguia gravar nada;
--   * o comprador do pedido não conseguia ler a posição da própria entrega.
--
-- As regras vivem em funções security definer porque o comprador não tem
-- leitura em `corridas` nem em `lotes_consolidacao`: uma subquery direta na
-- policy rodaria com a RLS dele e devolveria falso sempre.
--
-- Comprador só vê a posição enquanto a corrida não está Entregue/Cancelada
-- (privacidade do entregador depois da entrega). Vale para o pedido vinculado
-- direto (`corridas.pedido_id`) e para os pedidos de um lote consolidado (0074).

create or replace function public.pode_gravar_posicao_corrida(p_corrida_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from corridas c
    left join parceiros_logisticos p on p.id = c.parceiro_id
    where c.id = p_corrida_id
      and c.status in ('Coletada', 'EmTransito')
      and (p.user_id = auth.uid() or c.afiliado_exclusivo_id = auth.uid())
  );
$$;

create or replace function public.pode_ver_posicao_corrida(p_corrida_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from corridas c
    left join parceiros_logisticos p on p.id = c.parceiro_id
    where c.id = p_corrida_id
      and (
        c.solicitante_id = auth.uid()
        or p.user_id = auth.uid()
        or c.afiliado_exclusivo_id = auth.uid()
        or (
          c.status not in ('Entregue', 'Cancelada')
          and (
            exists (select 1 from pedidos pe
                    where pe.id = c.pedido_id and pe.cliente_id = auth.uid())
            or exists (select 1
                       from lotes_consolidacao l
                       join lote_pedidos lp on lp.lote_id = l.id
                       join pedidos pe on pe.id = lp.pedido_id
                       where l.corrida_id = c.id and pe.cliente_id = auth.uid())
          )
        )
      )
  );
$$;

revoke all on function public.pode_gravar_posicao_corrida(uuid) from public, anon;
revoke all on function public.pode_ver_posicao_corrida(uuid) from public, anon;
grant execute on function public.pode_gravar_posicao_corrida(uuid) to authenticated;
grant execute on function public.pode_ver_posicao_corrida(uuid) to authenticated;

drop policy if exists corrida_posicoes_insert on public.corrida_posicoes;
create policy corrida_posicoes_insert on public.corrida_posicoes
  for insert to authenticated
  with check (public.pode_gravar_posicao_corrida(corrida_id));

drop policy if exists corrida_posicoes_read on public.corrida_posicoes;
create policy corrida_posicoes_read on public.corrida_posicoes
  for select to authenticated
  using (public.pode_ver_posicao_corrida(corrida_id));

-- Realtime: o comprador assina as posições novas (postgres_changes respeita a
-- policy de leitura acima).
do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime'
                   and schemaname = 'public' and tablename = 'corrida_posicoes') then
    alter publication supabase_realtime add table public.corrida_posicoes;
  end if;
end $$;
