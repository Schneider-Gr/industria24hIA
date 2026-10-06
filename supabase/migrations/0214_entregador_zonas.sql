-- 0214: zonas de serviço do entregador (PRD 059, US01 a US03).
--
-- O afiliado logístico declara onde entrega: bairros de Manaus e/ou prefixos de
-- CEP de 5 dígitos. Sem PostGIS e sem raio (o raio atravessaria o Rio Negro).
--
-- 1. entregador_zonas: RLS ligada, só leitura (dono e admin). A escrita passa
--    pela entregador_zonas_salvar, que troca a zona inteira numa transação.
-- 2. normalizar_bairro: mesma regra do normalizarBairro de
--    src/lib/logistica-parceiro/bairros-manaus.ts (sem acento, minúsculo, só
--    letras e dígitos). O bairro é gravado já normalizado.
-- 3. entregador_atende: sem zona cadastrada = atende tudo, para não cortar quem
--    já entrega. Com zona: casa o prefixo do CEP ou o bairro do endereço.
-- 4. loja_tem_entregador_para: o checkout só oferece parceiro local se algum
--    afiliado logístico aprovado da loja atende o destino.
-- 5. despachar_corrida_automatica (base: produção em 06/10/2026, igual à 0207):
--    a exclusividade vai para quem atende o destino; ninguém atende = pool.

create table if not exists public.entregador_zonas (
  user_id   uuid not null references auth.users (id) on delete cascade,
  tipo      text not null check (tipo in ('bairro', 'cep_prefixo')),
  valor     text not null,
  criado_em timestamptz not null default now(),
  primary key (user_id, tipo, valor),
  constraint entregador_zonas_valor_chk check (
    (tipo = 'cep_prefixo' and valor ~ '^[0-9]{5}$')
    or (tipo = 'bairro' and valor ~ '^[a-z0-9]+( [a-z0-9]+)*$')
  )
);

alter table public.entregador_zonas enable row level security;

drop policy if exists entregador_zonas_read on public.entregador_zonas;
create policy entregador_zonas_read on public.entregador_zonas
  for select using (user_id = auth.uid() or public.is_admin());

comment on table public.entregador_zonas is
  'Zona de serviço do afiliado logístico (0214, PRD 059): bairros normalizados e prefixos de CEP de 5 dígitos. Sem linha = atende tudo.';

create or replace function public.normalizar_bairro(p text)
returns text
language sql
immutable
set search_path to 'public'
as $$
  select trim(regexp_replace(
    lower(translate(coalesce(p, ''),
      'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
      'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN')),
    '[^a-z0-9]+', ' ', 'g'));
$$;

create or replace function public.entregador_atende(p_user uuid, p_cep text, p_bairro text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select not exists (select 1 from entregador_zonas where user_id = p_user)
      or exists (
        select 1 from entregador_zonas z
        where z.user_id = p_user
          and ((z.tipo = 'cep_prefixo'
                and z.valor = left(lpad(regexp_replace(coalesce(p_cep, ''), '\D', '', 'g'), 8, '0'), 5))
            or (z.tipo = 'bairro' and z.valor = public.normalizar_bairro(p_bairro))));
$$;

create or replace function public.loja_tem_entregador_para(p_loja uuid, p_cep text, p_bairro text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from afiliacoes a
    where a.loja_id = p_loja and a.tipo = 'logistica' and a.status = 'Aprovada'
      and public.entregador_atende(a.afiliado_id, p_cep, p_bairro));
$$;

-- Troca a zona inteira do usuário logado. Listas vazias = volta a "atende tudo".
create or replace function public.entregador_zonas_salvar(p_bairros text[], p_prefixos text[])
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_user uuid := auth.uid();
  v_n integer;
begin
  if v_user is null then
    raise exception 'Faça login para salvar a zona.';
  end if;
  if coalesce(cardinality(p_bairros), 0) + coalesce(cardinality(p_prefixos), 0) > 1000 then
    raise exception 'Zona grande demais.';
  end if;
  if exists (select 1 from unnest(coalesce(p_prefixos, '{}')) x where x is null or x !~ '^[0-9]{5}$') then
    raise exception 'Prefixo de CEP deve ter exatamente 5 dígitos.';
  end if;

  delete from entregador_zonas where user_id = v_user;

  insert into entregador_zonas (user_id, tipo, valor)
  select v_user, 'bairro', b
  from (select distinct public.normalizar_bairro(x) as b from unnest(coalesce(p_bairros, '{}')) x) s
  where b <> ''
  union all
  select v_user, 'cep_prefixo', x
  from (select distinct x from unnest(coalesce(p_prefixos, '{}')) x) s;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke all on function public.entregador_atende(uuid, text, text) from public, anon, authenticated;
revoke all on function public.loja_tem_entregador_para(uuid, text, text) from public, anon, authenticated;
revoke all on function public.entregador_zonas_salvar(text[], text[]) from public, anon;
grant execute on function public.entregador_atende(uuid, text, text) to service_role;
grant execute on function public.loja_tem_entregador_para(uuid, text, text) to service_role;
grant execute on function public.entregador_zonas_salvar(text[], text[]) to authenticated;

-- ---------------------------------------------------------------- despacho
-- Base: definição de produção em 06/10/2026. Mudança marcada com "0214".
CREATE OR REPLACE FUNCTION public.despachar_corrida_automatica(p_pedido_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_ja_existe uuid;
  v_pedido record;
  v_item record;
  v_frete_total numeric(12,2);
  v_loja record;
  v_afiliado uuid;
  v_requer_revisao boolean;
  v_id uuid;
  v_cpl record; -- 0207
begin
  select id into v_ja_existe from corridas where pedido_id = p_pedido_id;
  if v_ja_existe is not null then
    return v_ja_existe; -- idempotente
  end if;

  select id, loja_id, frete_consolidado into v_pedido from pedidos where id = p_pedido_id;
  if not found then raise exception 'Pedido não encontrado.'; end if;

  -- 0074: consolidado espera o lote do admin (webhook trata null como "sem corrida")
  if v_pedido.frete_consolidado then
    return null;
  end if;

  select entrega_cep, entrega_rua, entrega_numero, entrega_bairro,
         entrega_cidade, entrega_complemento
    into v_item
  from linha_itens
  where pedido_id = p_pedido_id and retirar_na_loja = false and entrega_cep is not null
  limit 1;
  if not found then
    return null; -- retirada na loja: sem corrida
  end if;

  -- frete total do pedido (todas as linhas de entrega), não o de uma linha só
  select coalesce(sum(valor_frete), 0) into v_frete_total
  from linha_itens
  where pedido_id = p_pedido_id and retirar_na_loja = false;

  -- 0207 (PRD 056): entrega por parceiro local traz peso, veículo e balsa da cotação.
  select peso_kg, classe, balsa_centavos into v_cpl
  from cotacoes_parceiro_local where pedido_id = p_pedido_id;

  select cep, rua, numero, cidade, estado into v_loja
  from lojas where id = v_pedido.loja_id;

  -- afiliado exclusivo só se nenhum item com entrega estiver desabilitado
  -- 0214 (PRD 059): só quem atende o destino (bairro ou prefixo de CEP). Quem
  -- declarou zona vem antes de quem não declarou (sem zona = atende tudo);
  -- ninguém atende = v_afiliado null = pool aberto.
  select afiliado_id into v_afiliado
  from afiliacoes
  where loja_id = v_pedido.loja_id and tipo = 'logistica' and status = 'Aprovada'
    and not exists (
      select 1 from linha_itens li
      join produtos pr on pr.id = li.produto_id
      where li.pedido_id = p_pedido_id and li.retirar_na_loja = false
        and pr.permite_logistica_afiliado = false)
    and public.entregador_atende(afiliado_id, v_item.entrega_cep, v_item.entrega_bairro)
  order by exists (select 1 from entregador_zonas z where z.user_id = afiliado_id) desc,
           created_at asc
  limit 1;

  -- algum item do pedido pede revisão do afiliado antes do despacho?
  select exists (
    select 1 from linha_itens li
    join produtos pr on pr.id = li.produto_id
    where li.pedido_id = p_pedido_id and li.retirar_na_loja = false
      and pr.parceiro_logistico_habilitado
  ) into v_requer_revisao;

  insert into corridas (
    solicitante_id, pedido_id,
    origem_cep, origem_endereco,
    destino_cep, destino_endereco,
    peso_kg, modo, preco_sugerido, preco_final,
    janela_inicio, janela_fim,
    afiliado_exclusivo_id, exclusividade_fim,
    requer_revisao_afiliado, descricao_carga
  )
  select
    pe.cliente_id, p_pedido_id,
    coalesce(v_loja.cep, ''), concat_ws(', ', v_loja.rua, v_loja.numero, v_loja.cidade, v_loja.estado, v_loja.cep),
    v_item.entrega_cep, concat_ws(', ', v_item.entrega_rua, v_item.entrega_numero, v_item.entrega_bairro, v_item.entrega_cidade, v_item.entrega_complemento),
    -- peso_kg: o da cotação do parceiro local; sem ela, placeholder (NOT NULL exige > 0)
    coalesce(nullif(v_cpl.peso_kg, 0), 1),
    'primeiro_aceita',
    v_frete_total, v_frete_total,
    now(), now() + interval '4 hours', -- janela da 0048 (4h pro parceiro coletar)
    v_afiliado, case when v_afiliado is not null then now() + interval '5 minutes' else null end,
    (v_requer_revisao and v_afiliado is not null),
    case when v_cpl.classe is not null then
      concat_ws(' · ', 'Entrega por parceiro local',
        case v_cpl.classe when 'moto' then 'Moto' when 'carro' then 'Carro' else 'Caminhão' end,
        replace(trim(trailing '.' from trim(trailing '0' from v_cpl.peso_kg::text)), '.', ',') || ' kg',
        case when v_cpl.balsa_centavos > 0 then
          'com balsa (R$ ' || replace(to_char(v_cpl.balsa_centavos / 100.0, 'FM999990.00'), '.', ',') || ')' end)
    end
  from pedidos pe where pe.id = p_pedido_id
  returning id into v_id;

  insert into auditoria_eventos (ator_id, ator_papel, acao, tabela, registro_id, dados_depois)
  values (null, 'sistema', 'corrida.despacho_automatico', 'corridas', v_id,
          jsonb_build_object('pedido_id', p_pedido_id, 'afiliado_exclusivo_id', v_afiliado,
                              'requer_revisao_afiliado', v_requer_revisao and v_afiliado is not null));

  return v_id;
end; $function$;
