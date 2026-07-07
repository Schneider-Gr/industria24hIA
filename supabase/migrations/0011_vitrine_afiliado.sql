-- Vitrine pública + painel do afiliado.
-- 1) Leitura anônima do catálogo: a home multi-loja lista lojas Ativas e
--    produtos Aprovados sem sessão (Bubble expunha tudo; aqui é allowlist).
-- 2) linha_itens.afiliado_id: o Bubble guarda o afiliado no ITEM (campo
--    "afiliado " com espaço); sem essa coluna não há ganhos por afiliado.
-- 3) Afiliado lê as próprias afiliações/ganhos e solicita afiliação (Pendente).

-- ============ 1. Catálogo público ============
create policy lojas_public_read on public.lojas for select
  using (situacao = 'Ativa');

create policy produtos_public_read on public.produtos for select
  using (
    status_produto = 'Aprovado'
    and exists (select 1 from public.lojas l where l.id = loja_id and l.situacao = 'Ativa')
  );

create policy produto_imagens_public_read on public.produto_imagens for select
  using (exists (select 1 from public.produtos p where p.id = produto_id and p.status_produto = 'Aprovado'));

create policy promocoes_public_read on public.promocoes_progressivas for select
  using (ativo and exists (select 1 from public.produtos p where p.id = produto_id and p.status_produto = 'Aprovado'));

create policy vendas_futuras_public_read on public.vendas_futuras for select
  using (exists (select 1 from public.produtos p where p.id = produto_id and p.status_produto = 'Aprovado'));

-- ============ 2. Afiliado no item ============
alter table public.linha_itens
  add column if not exists afiliado_id uuid references auth.users (id) on delete set null;

create index if not exists linha_itens_afiliado_idx on public.linha_itens (afiliado_id);

-- ============ 3. Policies do afiliado ============
-- Lê e cancela as próprias afiliações; solicita nova sempre como Pendente.
create policy afiliacoes_afiliado_read on public.afiliacoes for select
  using (afiliado_id = auth.uid());

create policy afiliacoes_afiliado_insert on public.afiliacoes for insert
  with check (afiliado_id = auth.uid() and status = 'Pendente');

-- Ganhos: afiliado lê os itens em que aparece.
create policy linha_itens_afiliado_read on public.linha_itens for select
  using (afiliado_id = auth.uid());
