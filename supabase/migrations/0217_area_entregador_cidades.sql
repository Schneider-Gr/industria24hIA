-- 0217: área de atuação do parceiro logístico por estado, cidade e bairro.
--
-- Decisões da dona (08/10/2026): o estado vem do CEP base do cadastro; por
-- enquanto Amazonas e Acre; dentro do estado o parceiro marca cidades, e em
-- Manaus marca bairros; ele só vê e só aceita corrida da área que marcou. O
-- filtro olha coleta (pela cidade) e destino (cidade, e bairro em Manaus).
--
-- 1. municipios_cep: faixa de CEP de cada município (Correios + IBGE, 08/10/2026),
--    para o banco saber cidade e estado só pelo CEP, sem consulta externa.
-- 2. entregador_zonas aceita tipo 'cidade' (código IBGE).
-- 3. corridas.destino_bairro: bairro do destino, preenchido pelo app pelo CEP.
-- 4. entregador_area_salvar: grava cidades e bairros do cadastro do parceiro.
--    entregador_zonas_salvar (tela do afiliado) passa a preservar as cidades.
-- 5. entregador_atende: entende 'cidade' e só casa bairro quando o CEP é de
--    Manaus (antes "Centro" casava com o Centro de qualquer cidade).
-- 6. entregador_ve_corrida + corridas_feed_parceiro: o que o parceiro vê.
-- 7. aceitar_corrida e dar_lance_corrida recusam corrida fora da área
--    (base: produção em 08/10/2026).

-- 1. ---------------------------------------------------------------------
create table if not exists public.municipios_cep (
  cep_ini integer primary key,
  cep_fim integer not null check (cep_fim >= cep_ini),
  ibge    text not null check (ibge ~ '^[0-9]{7}$'),
  uf      text not null check (uf ~ '^[A-Z]{2}$'),
  nome    text not null
);
alter table public.municipios_cep enable row level security;
-- Sem policy: só as funções security definer abaixo leem.
comment on table public.municipios_cep is
  'Faixa de CEP por município (0217). Fonte: Correios (faixa de CEP por localidade) e IBGE, 08/10/2026. Espelha src/lib/logistica-parceiro/municipios.ts.';

insert into public.municipios_cep (cep_ini, cep_fim, ibge, uf, nome) values
  (69945000, 69949999, '1200013', 'AC', 'Acrelândia'),
  (69935000, 69939999, '1200054', 'AC', 'Assis Brasil'),
  (69932000, 69933999, '1200104', 'AC', 'Brasiléia'),
  (69926000, 69926999, '1200138', 'AC', 'Bujari'),
  (69931000, 69931999, '1200179', 'AC', 'Capixaba'),
  (69980000, 69981999, '1200203', 'AC', 'Cruzeiro do Sul'),
  (69934000, 69934999, '1200252', 'AC', 'Epitaciolândia'),
  (69960000, 69969999, '1200302', 'AC', 'Feijó'),
  (69975000, 69979999, '1200328', 'AC', 'Jordão'),
  (69990000, 69999999, '1200336', 'AC', 'Mâncio Lima'),
  (69950000, 69954999, '1200344', 'AC', 'Manoel Urbano'),
  (69983000, 69984999, '1200351', 'AC', 'Marechal Thaumaturgo'),
  (69928000, 69929999, '1200385', 'AC', 'Plácido de Castro'),
  (69927000, 69927999, '1200807', 'AC', 'Porto Acre'),
  (69982000, 69982999, '1200393', 'AC', 'Porto Walter'),
  (69900000, 69924999, '1200401', 'AC', 'Rio Branco'),
  (69985000, 69989999, '1200427', 'AC', 'Rodrigues Alves'),
  (69955000, 69959999, '1200435', 'AC', 'Santa Rosa do Purus'),
  (69940000, 69944999, '1200500', 'AC', 'Sena Madureira'),
  (69925000, 69925999, '1200450', 'AC', 'Senador Guiomard'),
  (69970000, 69974999, '1200609', 'AC', 'Tarauacá'),
  (69930000, 69930999, '1200708', 'AC', 'Xapuri'),
  (69540000, 69549999, '1300029', 'AM', 'Alvarães'),
  (69620000, 69629999, '1300060', 'AM', 'Amaturá'),
  (69445000, 69449999, '1300086', 'AM', 'Anamã'),
  (69440000, 69444999, '1300102', 'AM', 'Anori'),
  (69265000, 69279999, '1300144', 'AM', 'Apuí'),
  (69650000, 69659999, '1300201', 'AM', 'Atalaia do Norte'),
  (69240000, 69249999, '1300300', 'AM', 'Autazes'),
  (69700000, 69719999, '1300409', 'AM', 'Barcelos'),
  (69160000, 69179999, '1300508', 'AM', 'Barreirinha'),
  (69630000, 69639999, '1300607', 'AM', 'Benjamin Constant'),
  (69430000, 69434999, '1300631', 'AM', 'Beruri'),
  (69220000, 69229999, '1300680', 'AM', 'Boa Vista do Ramos'),
  (69850000, 69859999, '1300706', 'AM', 'Boca do Acre'),
  (69200000, 69219999, '1300805', 'AM', 'Borba'),
  (69425000, 69429999, '1300839', 'AM', 'Caapiranga'),
  (69820000, 69829999, '1300904', 'AM', 'Canutama'),
  (69500000, 69509999, '1301001', 'AM', 'Carauari'),
  (69250000, 69254999, '1301100', 'AM', 'Careiro'),
  (69255000, 69259999, '1301159', 'AM', 'Careiro da Várzea'),
  (69460000, 69469999, '1301209', 'AM', 'Coari'),
  (69450000, 69459999, '1301308', 'AM', 'Codajás'),
  (69880000, 69889999, '1301407', 'AM', 'Eirunepé'),
  (69870000, 69879999, '1301506', 'AM', 'Envira'),
  (69670000, 69679999, '1301605', 'AM', 'Fonte Boa'),
  (69895000, 69899999, '1301654', 'AM', 'Guajará'),
  (69800000, 69819999, '1301704', 'AM', 'Humaitá'),
  (69890000, 69894999, '1301803', 'AM', 'Ipixuna'),
  (69415000, 69424999, '1301852', 'AM', 'Iranduba'),
  (69100000, 69113999, '1301902', 'AM', 'Itacoatiara'),
  (69510000, 69519999, '1301951', 'AM', 'Itamarati'),
  (69120000, 69129999, '1302009', 'AM', 'Itapiranga'),
  (69495000, 69499999, '1302108', 'AM', 'Japurá'),
  (69520000, 69529999, '1302207', 'AM', 'Juruá'),
  (69660000, 69669999, '1302306', 'AM', 'Jutaí'),
  (69830000, 69849999, '1302405', 'AM', 'Lábrea'),
  (69400000, 69414999, '1302504', 'AM', 'Manacapuru'),
  (69435000, 69439999, '1302553', 'AM', 'Manaquiri'),
  (69000000, 69099999, '1302603', 'AM', 'Manaus'),
  (69280000, 69299999, '1302702', 'AM', 'Manicoré'),
  (69490000, 69494999, '1302801', 'AM', 'Maraã'),
  (69190000, 69199999, '1302900', 'AM', 'Maués'),
  (69140000, 69149999, '1303007', 'AM', 'Nhamundá'),
  (69230000, 69239999, '1303106', 'AM', 'Nova Olinda do Norte'),
  (69730000, 69734999, '1303205', 'AM', 'Novo Airão'),
  (69260000, 69264999, '1303304', 'AM', 'Novo Aripuanã'),
  (69150000, 69159999, '1303403', 'AM', 'Parintins'),
  (69860000, 69869999, '1303502', 'AM', 'Pauini'),
  (69720000, 69729999, '1303536', 'AM', 'Presidente Figueiredo'),
  (69735000, 69739999, '1303536', 'AM', 'Presidente Figueiredo'),
  (69117000, 69119999, '1303569', 'AM', 'Rio Preto da Eva'),
  (69740000, 69749999, '1303601', 'AM', 'Santa Isabel do Rio Negro'),
  (69680000, 69684999, '1303700', 'AM', 'Santo Antônio do Içá'),
  (69750000, 69799999, '1303809', 'AM', 'São Gabriel da Cachoeira'),
  (69600000, 69619999, '1303908', 'AM', 'São Paulo de Olivença'),
  (69135000, 69139999, '1303957', 'AM', 'São Sebastião do Uatumã'),
  (69114000, 69116999, '1304005', 'AM', 'Silves'),
  (69640000, 69649999, '1304062', 'AM', 'Tabatinga'),
  (69480000, 69484999, '1304104', 'AM', 'Tapauá'),
  (69550000, 69559999, '1304203', 'AM', 'Tefé'),
  (69685000, 69699999, '1304237', 'AM', 'Tonantins'),
  (69530000, 69539999, '1304260', 'AM', 'Uarini'),
  (69130000, 69134999, '1304302', 'AM', 'Urucará'),
  (69180000, 69189999, '1304401', 'AM', 'Urucurituba')
on conflict (cep_ini) do nothing;

create or replace function public.municipio_do_cep(p_cep text)
returns text
language sql
stable
security definer
set search_path to 'public'
as $$
  select m.ibge
  from (select regexp_replace(coalesce(p_cep, ''), '\D', '', 'g') as d) x
  join municipios_cep m
    on (case when x.d ~ '^[0-9]{8}$' then x.d::integer end) between m.cep_ini and m.cep_fim
  limit 1;
$$;

-- UF do município; 'XX' para CEP válido fora da tabela; null para CEP incompleto.
create or replace function public.uf_do_cep(p_cep text)
returns text
language sql
stable
security definer
set search_path to 'public'
as $$
  select case
    when x.d !~ '^[0-9]{8}$' then null
    else coalesce((select m.uf from municipios_cep m where x.d::integer between m.cep_ini and m.cep_fim limit 1), 'XX')
  end
  from (select regexp_replace(coalesce(p_cep, ''), '\D', '', 'g') as d) x;
$$;

-- 2. ---------------------------------------------------------------------
alter table public.entregador_zonas drop constraint if exists entregador_zonas_tipo_check;
alter table public.entregador_zonas drop constraint if exists entregador_zonas_valor_chk;
alter table public.entregador_zonas
  add constraint entregador_zonas_tipo_check check (tipo in ('bairro', 'cep_prefixo', 'cidade')),
  add constraint entregador_zonas_valor_chk check (
    (tipo = 'cep_prefixo' and valor ~ '^[0-9]{5}$')
    or (tipo = 'bairro' and valor ~ '^[a-z0-9]+( [a-z0-9]+)*$')
    or (tipo = 'cidade' and valor ~ '^[0-9]{7}$')
  );
comment on table public.entregador_zonas is
  'Área do entregador (0214, 0217): cidades (código IBGE), bairros de Manaus normalizados e prefixos de CEP de 5 dígitos. Sem linha = sem recorte.';

-- 3. ---------------------------------------------------------------------
alter table public.corridas add column if not exists destino_bairro text;
comment on column public.corridas.destino_bairro is
  'Bairro do destino, normalizado (0217). O app preenche pelo CEP; nulo = desconhecido, e o filtro de área cai para a cidade.';

-- 4. ---------------------------------------------------------------------
create or replace function public.entregador_area_salvar(p_cidades text[], p_bairros text[])
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
    raise exception 'Faça login para salvar a área de atuação.';
  end if;
  if coalesce(cardinality(p_cidades), 0) + coalesce(cardinality(p_bairros), 0) > 1000 then
    raise exception 'Área grande demais.';
  end if;
  if exists (select 1 from unnest(coalesce(p_cidades, '{}')) x
             where x is null or not exists (select 1 from municipios_cep m where m.ibge = x)) then
    raise exception 'Cidade fora da lista de municípios atendidos.';
  end if;

  delete from entregador_zonas where user_id = v_user and tipo in ('cidade', 'bairro');

  insert into entregador_zonas (user_id, tipo, valor)
  select v_user, 'bairro', b
  from (select distinct public.normalizar_bairro(x) as b from unnest(coalesce(p_bairros, '{}')) x) s
  where b <> ''
  union all
  select v_user, 'cidade', x
  from (select distinct x from unnest(coalesce(p_cidades, '{}')) x) s;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

CREATE OR REPLACE FUNCTION public.entregador_zonas_salvar(p_bairros text[], p_prefixos text[])
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  delete from entregador_zonas where user_id = v_user and tipo in ('bairro', 'cep_prefixo');

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
$function$;

-- 5. ---------------------------------------------------------------------
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
            or (z.tipo = 'cidade' and z.valor = public.municipio_do_cep(p_cep))
            or (z.tipo = 'bairro' and z.valor = public.normalizar_bairro(p_bairro)
                and coalesce(public.municipio_do_cep(p_cep), '1302603') = '1302603')));
$$;

-- 6. ---------------------------------------------------------------------
-- Coleta: basta ser numa cidade que ele atende. Destino: cidade, e em Manaus o
-- bairro quando conhecido. CEP ausente não barra; CEP de fora da tabela barra
-- quem tem área marcada.
create or replace function public.entregador_ve_corrida(
  p_user uuid, p_origem_cep text, p_destino_cep text, p_destino_bairro text)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_uf text;
  v_uf_o text := public.uf_do_cep(p_origem_cep);
  v_uf_d text := public.uf_do_cep(p_destino_cep);
  v_mun_o text := public.municipio_do_cep(p_origem_cep);
  v_mun_d text := public.municipio_do_cep(p_destino_cep);
begin
  select public.uf_do_cep(cep_base) into v_uf from parceiros_logisticos where user_id = p_user;

  if v_uf is not null and ((v_uf_o is not null and v_uf_o <> v_uf) or (v_uf_d is not null and v_uf_d <> v_uf)) then
    return false;
  end if;

  if not exists (select 1 from entregador_zonas where user_id = p_user) then
    return true;
  end if;
  if v_uf_o = 'XX' or v_uf_d = 'XX' then
    return false;
  end if;

  if v_mun_o is not null and not exists (
    select 1 from entregador_zonas z
    where z.user_id = p_user
      and ((z.tipo = 'cidade' and z.valor = v_mun_o)
        or (z.tipo = 'bairro' and v_mun_o = '1302603')
        or (z.tipo = 'cep_prefixo' and z.valor = left(regexp_replace(p_origem_cep, '\D', '', 'g'), 5)))) then
    return false;
  end if;

  if v_mun_d is null then
    return true;
  end if;
  return exists (
    select 1 from entregador_zonas z
    where z.user_id = p_user
      and ((z.tipo = 'cep_prefixo' and z.valor = left(regexp_replace(p_destino_cep, '\D', '', 'g'), 5))
        or (z.tipo = 'cidade' and z.valor = v_mun_d)
        or (z.tipo = 'bairro' and v_mun_d = '1302603'
            and (coalesce(p_destino_bairro, '') = '' or z.valor = public.normalizar_bairro(p_destino_bairro)))));
end;
$$;

create or replace function public.corridas_feed_parceiro()
returns setof uuid
language sql
stable
security definer
set search_path to 'public'
as $$
  select c.id
  from corridas c
  where c.status = 'Publicada'
    and exists (select 1 from parceiros_logisticos p where p.user_id = auth.uid() and p.status = 'Aprovado')
    and public.entregador_ve_corrida(auth.uid(), c.origem_cep, c.destino_cep, c.destino_bairro);
$$;

revoke all on function public.municipio_do_cep(text) from public, anon, authenticated;
revoke all on function public.uf_do_cep(text) from public, anon, authenticated;
revoke all on function public.entregador_ve_corrida(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.entregador_area_salvar(text[], text[]) from public, anon;
revoke all on function public.corridas_feed_parceiro() from public, anon;
grant execute on function public.municipio_do_cep(text) to service_role;
grant execute on function public.uf_do_cep(text) to service_role;
grant execute on function public.entregador_ve_corrida(uuid, text, text, text) to service_role;
grant execute on function public.entregador_area_salvar(text[], text[]) to authenticated;
grant execute on function public.corridas_feed_parceiro() to authenticated;

-- 7. ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.aceitar_corrida(p_corrida_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_p uuid;              -- id em parceiros_logisticos, se houver
  v_afiliado boolean := false;
  v_c record;
begin
  select id into v_p from parceiros_logisticos where user_id = auth.uid() and status = 'Aprovado';

  select * into v_c from corridas where id = p_corrida_id for update;
  if not found then raise exception 'Corrida não encontrada.'; end if;
  if v_c.status <> 'Publicada' then raise exception 'Corrida não está mais disponível.'; end if;
  if v_c.modo <> 'primeiro_aceita' then raise exception 'Esta corrida é por leilão: dê um lance.'; end if;
  if v_c.requer_revisao_afiliado and v_c.afiliado_exclusivo_id = auth.uid() then
    raise exception 'Revise peso, janela e descrição antes de aceitar esta corrida.';
  end if;

  -- janela de exclusividade: só o afiliado_exclusivo_id aceita antes do prazo
  if v_c.afiliado_exclusivo_id is not null and v_c.exclusividade_fim > now()
     and v_c.afiliado_exclusivo_id <> auth.uid() then
    raise exception 'Corrida em janela de exclusividade de outro afiliado.';
  end if;

  if v_c.afiliado_exclusivo_id = auth.uid() then
    v_afiliado := true;
  elsif v_p is null then
    raise exception 'Apenas parceiro logístico aprovado ou afiliado logístico aceita corridas.';
  elsif not public.entregador_ve_corrida(auth.uid(), v_c.origem_cep, v_c.destino_cep, v_c.destino_bairro) then
    raise exception 'Esta corrida está fora da sua área de atuação.';
  end if;

  update corridas set status = 'Aceita',
    parceiro_id = v_p,
    afiliado_exclusivo_id = case when v_afiliado then auth.uid() else null end
  where id = p_corrida_id;

  insert into auditoria_eventos (ator_id, ator_papel, acao, tabela, registro_id, dados_depois)
  values (auth.uid(), case when v_afiliado then 'afiliado' else 'parceiro' end,
          'corrida.aceita', 'corridas', p_corrida_id,
          jsonb_build_object('parceiro_id', v_p, 'afiliado_exclusivo', v_afiliado));
end; $function$;

CREATE OR REPLACE FUNCTION public.dar_lance_corrida(p_corrida_id uuid, p_valor numeric, p_prazo text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_p uuid;
begin
  select id into v_p from parceiros_logisticos where user_id = auth.uid() and status = 'Aprovado';
  if v_p is null then raise exception 'Apenas parceiro logístico aprovado dá lance.'; end if;
  if p_valor is null or p_valor <= 0 then raise exception 'Valor do lance inválido.'; end if;
  if not exists (select 1 from corridas where id = p_corrida_id and status = 'Publicada' and modo = 'leilao') then
    raise exception 'Corrida indisponível para lances.';
  end if;
  if not exists (select 1 from corridas c where c.id = p_corrida_id
                 and public.entregador_ve_corrida(auth.uid(), c.origem_cep, c.destino_cep, c.destino_bairro)) then
    raise exception 'Esta corrida está fora da sua área de atuação.';
  end if;
  insert into corrida_lances (corrida_id, parceiro_id, valor, prazo)
  values (p_corrida_id, v_p, p_valor, p_prazo)
  on conflict (corrida_id, parceiro_id) do update set valor = excluded.valor, prazo = excluded.prazo, criado_em = now();
end; $function$;
