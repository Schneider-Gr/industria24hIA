-- Painel do afiliado logístico + listagem de usuários no admin.
-- 1) afiliacoes.tipo — o Bubble tem DOIS tipos de relação afiliado↔loja:
--    Relacao_Afiliado_Loja ('vendas', 51 registros migrados) e
--    Relacao_Afiliado.transporte_Loja ('logistica', página `afiliadologistica`).
-- 2) Afiliado logístico APROVADO enxerga pedidos/itens das lojas afiliadas
--    através de VIEWS operacionais (id/produto/quantidade/endereço), NUNCA a
--    tabela inteira — a linha crua de pedidos/linha_itens carrega link Asaas,
--    repasses da plataforma e PII financeira (mesmo motivo que levou a 0013 a
--    trocar linha_itens_afiliado_read por uma view). Opera entregas na tabela
--    `entregas` (0009), fonte de verdade única do fulfillment.
-- 3) admin_list_users(): tela /admin/usuarios lista o auth via security definer
--    guardado por is_admin() (sem service_role no app — regra do projeto).

alter table public.afiliacoes
  add column if not exists tipo text not null default 'vendas'
  check (tipo in ('vendas','logistica'));

-- Uma afiliação por (afiliado, alvo, tipo): fecha corrida de duplo submit no
-- solicitar (check-then-insert não é atômico) e spam via POST /rest/v1/afiliacoes.
-- coalesce p/ tratar o NULL de produto_id (afiliação por loja) e vice-versa.
-- Se os 51 registros migrados tiverem duplicata, o CREATE UNIQUE falha; este
-- bloco aborta ANTES com a lista dos pares em conflito, para revisão manual.
do $$
declare dups int;
begin
  select count(*) into dups from (
    select 1 from public.afiliacoes
    group by afiliado_id,
             coalesce(produto_id, '00000000-0000-0000-0000-000000000000'::uuid),
             coalesce(loja_id, '00000000-0000-0000-0000-000000000000'::uuid), tipo
    having count(*) > 1
  ) d;
  if dups > 0 then
    raise exception 'Existem % grupos de afiliação duplicada — deduplique antes de aplicar o índice único (SELECT afiliado_id, produto_id, loja_id, tipo, count(*) FROM afiliacoes GROUP BY 1,2,3,4 HAVING count(*)>1).', dups;
  end if;
end $$;

create unique index if not exists afiliacoes_unq_alvo on public.afiliacoes
  (afiliado_id, coalesce(produto_id, '00000000-0000-0000-0000-000000000000'::uuid),
   coalesce(loja_id, '00000000-0000-0000-0000-000000000000'::uuid), tipo);

-- STABLE + search_path fixo (advisor function_search_path_mutable). Roda como
-- invoker, sob a RLS de afiliacoes do próprio uid — sem recursão (afiliacoes
-- não referencia pedidos) e sem bypass.
create or replace function public.eh_afiliado_logistica(p_loja uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1 from public.afiliacoes a
    where a.loja_id = p_loja
      and a.afiliado_id = auth.uid()
      and a.tipo = 'logistica'
      and a.status = 'Aprovada'
  );
$$;

-- ============ Views operacionais do afiliado logístico ============
-- Rodam como owner (security_invoker off) e bypassam a RLS das tabelas base;
-- o recorte de tenant vem do WHERE eh_afiliado_logistica na própria definição
-- (padrão da view afiliado_ganhos da 0013). Expõem SÓ colunas de logística —
-- zero financeiro (repasse*/pago/transferido/dt_pagamento), zero Asaas, zero
-- PII de contato. Endereço de entrega ENTRA: é o que o afiliado precisa p/ entregar.
create or replace view public.logistica_pedidos as
  select id, id_venda, loja_id, data, status_pedido
  from public.pedidos
  where public.eh_afiliado_logistica(loja_id);

grant select on public.logistica_pedidos to authenticated;

create or replace view public.logistica_itens as
  select li.id, li.pedido_id, li.produto_nome, li.quantidade, li.valor,
         li.entrega_cep, li.entrega_rua, li.entrega_bairro, li.entrega_numero,
         li.entrega_cidade, li.entrega_complemento, li.retirar_na_loja
  from public.linha_itens li
  join public.pedidos pe on pe.id = li.pedido_id
  where public.eh_afiliado_logistica(pe.loja_id);

grant select on public.logistica_itens to authenticated;

-- ============ entregas: fonte de verdade única do fulfillment ============
-- Além do admin (0009), o afiliado logístico e o SELLER dono operam entregas
-- dos itens sob sua alçada. seller/pedidos passa a ler/gravar aqui em vez da
-- flag legada linha_itens.entregue (que fica só como fallback de leitura p/
-- dados migrados que ainda não têm linha em `entregas`).
create policy entregas_logistica_select on public.entregas for select
  using (exists (
    select 1 from public.linha_itens li
    join public.pedidos pe on pe.id = li.pedido_id
    where li.id = linha_item_id and public.eh_afiliado_logistica(pe.loja_id)
  ));

create policy entregas_logistica_write on public.entregas for insert
  with check (exists (
    select 1 from public.linha_itens li
    join public.pedidos pe on pe.id = li.pedido_id
    where li.id = linha_item_id and public.eh_afiliado_logistica(pe.loja_id)
  ));

create policy entregas_logistica_update on public.entregas for update
  using (exists (
    select 1 from public.linha_itens li
    join public.pedidos pe on pe.id = li.pedido_id
    where li.id = linha_item_id and public.eh_afiliado_logistica(pe.loja_id)
  ))
  with check (exists (
    select 1 from public.linha_itens li
    join public.pedidos pe on pe.id = li.pedido_id
    where li.id = linha_item_id and public.eh_afiliado_logistica(pe.loja_id)
  ));

-- Seller dono do item (via linha_itens→pedidos→lojas.owner_id).
create policy entregas_seller_all on public.entregas for all
  using (exists (
    select 1 from public.linha_itens li
    join public.pedidos pe on pe.id = li.pedido_id
    join public.lojas l on l.id = pe.loja_id
    where li.id = linha_item_id and l.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.linha_itens li
    join public.pedidos pe on pe.id = li.pedido_id
    join public.lojas l on l.id = pe.loja_id
    where li.id = linha_item_id and l.owner_id = auth.uid()
  ));

-- ============ Insert de afiliação (anti mass-assignment) ============
-- A policy da 0012 fixava porcentagem = % do PRODUTO; com produto_id null
-- (afiliação por loja, D-mig3) a subquery escalar vira NULL e o insert era
-- sempre negado. Reforços desta versão:
--  · afiliação por PRODUTO é sempre 'vendas' e o loja_id enviado TEM de ser a
--    loja do produto (senão o afiliado plantava afiliação na loja de terceiro);
--  · afiliação por LOJA (produto_id null) pode ser vendas|logistica, % pinada em 5.
drop policy if exists afiliacoes_afiliado_insert on public.afiliacoes;
create policy afiliacoes_afiliado_insert on public.afiliacoes for insert
  with check (
    afiliado_id = auth.uid()
    and status = 'Pendente'
    and (
      (
        produto_id is not null
        and tipo = 'vendas'
        and loja_id = (select p.loja_id from public.produtos p where p.id = produto_id)
        and porcentagem = (
          select coalesce(p.porcentagem_afiliado, 5)
          from public.produtos p
          where p.id = produto_id
        )
      )
      or (produto_id is null and loja_id is not null and porcentagem = 5)
    )
  );

-- ============ Admin: listagem de usuários ============
create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  criado_em timestamptz,
  ultimo_login timestamptz,
  eh_admin boolean,
  loja_nome text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    u.id,
    u.email::text,
    u.created_at,
    u.last_sign_in_at,
    exists (select 1 from public.admins a where a.user_id = u.id),
    (select l.nome from public.lojas l where l.owner_id = u.id limit 1)
  from auth.users u
  where public.is_admin()  -- não-admin recebe conjunto vazio
  order by u.created_at desc
$$;

revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;
