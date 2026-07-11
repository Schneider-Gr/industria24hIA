-- 0012: hardening de segurança (bug hunt 2026-07-07, bugs 1, 2, 4 e 5)
--
-- 1) Moderação só-admin: as policies `for all` de dono (0002) não restringem
--    coluna, então o seller autenticado conseguia auto-aprovar produto e
--    reativar a própria loja pelo console com a anon key pública. REVOKE de
--    coluna não resolve (admin usa a mesma role authenticated) → trigger.
-- 2) Campos financeiros de pedidos/linha_itens (pago, transferido, repasses,
--    Asaas) idem: só admin ou service_role.
-- 3) `lojas_public_read` (0011) vazava chave_pix, cnpj, e-mail e endereço de
--    toda loja Ativa para anon. Catálogo público agora lê a view
--    `lojas_vitrine` (só colunas de catálogo + whatsapp, que é o CTA).
-- 4) Afiliação: porcentagem aceitava 999,99 — CHECK 0..100.

-- ============ 1+2. Trigger de campos restritos ============
create or replace function public.guard_campos_restritos()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- service_role/postgres (auth.uid() null) e admins passam.
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if tg_table_name = 'produtos' then
    if tg_op = 'INSERT' then
      if new.status_produto is distinct from 'Pendente' then
        raise exception 'Produto novo nasce Pendente; aprovação é do admin.';
      end if;
    elsif new.status_produto is distinct from old.status_produto then
      raise exception 'Apenas admin altera status_produto (moderação).';
    end if;

  elsif tg_table_name = 'lojas' then
    if tg_op = 'UPDATE' and new.situacao is distinct from old.situacao then
      raise exception 'Apenas admin altera a situação da loja (moderação).';
    end if;

  elsif tg_table_name = 'pedidos' then
    if tg_op = 'UPDATE' and (
         new.valor_pedido is distinct from old.valor_pedido
      or new.repasse_ind24 is distinct from old.repasse_ind24
      or new.valor_recebido_industria is distinct from old.valor_recebido_industria
      or new.asaas_cobranca_id is distinct from old.asaas_cobranca_id
      or new.link_cobranca is distinct from old.link_cobranca
      or new.dt_pagamento is distinct from old.dt_pagamento
    ) then
      raise exception 'Apenas admin altera campos financeiros do pedido.';
    end if;

  elsif tg_table_name = 'linha_itens' then
    if tg_op = 'UPDATE' and (
         new.valor is distinct from old.valor
      or new.pago is distinct from old.pago
      or new.transferido is distinct from old.transferido
      or new.repasse_ind is distinct from old.repasse_ind
      or new.repasse_afiliado is distinct from old.repasse_afiliado
      or new.repasse_vendedor is distinct from old.repasse_vendedor
      or new.dt_pagamento_cliente is distinct from old.dt_pagamento_cliente
    ) then
      raise exception 'Apenas admin altera campos financeiros do item.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_produtos_moderacao on public.produtos;
create trigger guard_produtos_moderacao
  before insert or update on public.produtos
  for each row execute function public.guard_campos_restritos();

drop trigger if exists guard_lojas_moderacao on public.lojas;
create trigger guard_lojas_moderacao
  before update on public.lojas
  for each row execute function public.guard_campos_restritos();

drop trigger if exists guard_pedidos_financeiro on public.pedidos;
create trigger guard_pedidos_financeiro
  before update on public.pedidos
  for each row execute function public.guard_campos_restritos();

drop trigger if exists guard_linha_itens_financeiro on public.linha_itens;
create trigger guard_linha_itens_financeiro
  before update on public.linha_itens
  for each row execute function public.guard_campos_restritos();

-- ============ 3. Catálogo público sem PII ============
-- View roda como owner (security_invoker off) e bypassa a RLS da tabela;
-- expõe apenas colunas de catálogo das lojas Ativas.
create or replace view public.lojas_vitrine as
  select id, nome, descricao, logotipo_url, banner_url, whatsapp,
         cidade, estado, situacao, valor_pedido_minimo, permite_retirada_na_loja
  from public.lojas
  where situacao = 'Ativa';

grant select on public.lojas_vitrine to anon, authenticated;

-- produtos_public_read (0011) referenciava lojas por subquery, que passa pela
-- RLS de lojas do usuário consultante: sem a policy pública abaixo o catálogo
-- de produtos sumiria para anon. Recria a policy apontando para a view (que
-- não passa por RLS) antes de derrubar a leitura pública da tabela.
drop policy if exists produtos_public_read on public.produtos;
create policy produtos_public_read on public.produtos for select
  using (
    status_produto = 'Aprovado'
    and exists (select 1 from public.lojas_vitrine v where v.id = loja_id)
  );

drop policy if exists lojas_public_read on public.lojas;

-- ============ 4. Porcentagem de afiliação ============
alter table public.afiliacoes
  drop constraint if exists afiliacoes_porcentagem_faixa,
  add constraint afiliacoes_porcentagem_faixa
    check (porcentagem >= 0 and porcentagem <= 100);

-- O afiliado não escolhe a própria comissão: o insert herda a % definida
-- no produto pelo seller (mass assignment via POST /api/afiliacoes).
drop policy if exists afiliacoes_afiliado_insert on public.afiliacoes;
create policy afiliacoes_afiliado_insert on public.afiliacoes for insert
  with check (
    afiliado_id = auth.uid()
    and status = 'Pendente'
    and porcentagem = (
      select coalesce(p.porcentagem_afiliado, 5)
      from public.produtos p
      where p.id = produto_id
    )
  );
