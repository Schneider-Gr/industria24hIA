-- Junção vitrine <-> produtos, cada linha ancorada numa afiliação existente
-- (nunca um identificador novo de rastreio) — ver
-- openspec/changes/afiliado-selecao-vitrine/specs/afiliado-vitrine-curada.

create table if not exists afiliado_vitrine_produtos (
  id uuid primary key default gen_random_uuid(),
  vitrine_id uuid not null references afiliado_vitrines(id) on delete cascade,
  produto_id uuid not null references produtos(id) on delete cascade,
  afiliacao_id uuid not null references afiliacoes(id) on delete cascade,
  criado_em timestamptz not null default now(),
  unique (vitrine_id, produto_id)
);

create index if not exists afiliado_vitrine_produtos_vitrine_id_idx on afiliado_vitrine_produtos (vitrine_id);

-- Garante que a afiliação usada pertence ao mesmo afiliado dono da vitrine
-- e ao mesmo produto da linha — trigger em vez de check simples porque a
-- constraint cruza duas tabelas (afiliado_vitrines.afiliado_id e afiliacoes.afiliado_id/produto_id).
create or replace function afiliado_vitrine_produtos_valida_dono()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dono uuid;
  a_dono uuid;
  a_produto uuid;
begin
  select afiliado_id into v_dono from afiliado_vitrines where id = new.vitrine_id;
  select afiliado_id, produto_id into a_dono, a_produto from afiliacoes where id = new.afiliacao_id;

  if v_dono is null or a_dono is null or v_dono <> a_dono then
    raise exception 'Afiliação não pertence ao dono da vitrine.';
  end if;

  if a_produto is null or a_produto <> new.produto_id then
    raise exception 'Afiliação não corresponde ao produto informado.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_afiliado_vitrine_produtos_valida_dono on afiliado_vitrine_produtos;
create trigger trg_afiliado_vitrine_produtos_valida_dono
  before insert or update on afiliado_vitrine_produtos
  for each row execute function afiliado_vitrine_produtos_valida_dono();

alter table afiliado_vitrine_produtos enable row level security;

-- Leitura pública: a página da coleção lista produtos sem login. Sem PII aqui
-- (só ids), a exposição equivalente já existe hoje via `afiliacoes.identificador`.
create policy afiliado_vitrine_produtos_select_publico on afiliado_vitrine_produtos
  for select
  using (true);

create policy afiliado_vitrine_produtos_dono_all on afiliado_vitrine_produtos
  for all
  using (
    exists (
      select 1 from afiliado_vitrines v
      where v.id = vitrine_id and v.afiliado_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from afiliado_vitrines v
      where v.id = vitrine_id and v.afiliado_id = auth.uid()
    )
  );
