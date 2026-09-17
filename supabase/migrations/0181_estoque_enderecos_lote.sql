-- 0181: cadastro em lote de posições de armazenagem (US02 do PRD 039).
--
-- A 0176 criou `estoque_endereco_criar`, que cadastra uma posição por chamada.
-- Um galpão endereçado tem dezenas ou centenas de posições, e o CD do Indústria
-- está em produção com zero delas justamente porque ninguém cadastra 360
-- endereços um a um. Enquanto não houver posição, nada entra no CD, porque a
-- regra de endereço obrigatório na entrada vale (0179).
--
-- Uma chamada por posição também não serve: 360 idas ao banco, sem transação
-- comum, deixariam o galpão meio cadastrado se a rede caísse no meio.

create or replace function public.estoque_enderecos_criar_lote(
  p_centro_id    uuid,
  p_ruas         text[],
  p_predios      text[],
  p_niveis       text[],
  p_apartamentos text[]
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user  uuid := auth.uid();
  v_total int;
  v_criados int;
begin
  if v_user is null then
    raise exception 'Faça login para cadastrar endereços de armazenagem.';
  end if;

  -- Mesma resolução por dono da 0176: `lojas_public_read` combina por OR com a
  -- policy do dono, então sem este filtro daria para endereçar o centro alheio.
  if not exists (
    select 1 from public.centros_distribuicao c
      join public.lojas l on l.id = c.loja_id
     where c.id = p_centro_id and l.owner_id = v_user
  ) then
    raise exception 'Centro de distribuição não encontrado nesta loja.';
  end if;

  if coalesce(array_length(p_ruas, 1), 0) = 0
     or coalesce(array_length(p_predios, 1), 0) = 0
     or coalesce(array_length(p_niveis, 1), 0) = 0
     or coalesce(array_length(p_apartamentos, 1), 0) = 0 then
    raise exception 'Informe ao menos um valor para rua, prédio, nível e apartamento.';
  end if;

  v_total := array_length(p_ruas, 1) * array_length(p_predios, 1)
           * array_length(p_niveis, 1) * array_length(p_apartamentos, 1);

  -- Mesmo teto da tela (MAX_POSICOES_POR_LOTE em src/lib/estoque/faixa-enderecos.ts).
  -- Repetido aqui de propósito: a tela é conveniência, o banco é a autoridade.
  if v_total > 2000 then
    raise exception 'Este lote geraria % posições, acima do limite de 2000. Divida em lotes menores.', v_total;
  end if;

  -- Hífen dentro de uma parte quebra a unicidade do código. O `codigo` é
  -- `rua-predio-nivel-apartamento`, então a rua `AA-BB` com prédio `CC` e a rua
  -- `AA` com prédio `BB-CC` produzem o mesmo `AA-BB-CC-1-1`: dois nomes para a
  -- mesma posição, que é o que a coluna gerada da 0176 existe para impedir. O
  -- `on conflict` engoliria a segunda em silêncio, e a tela diria "já existia"
  -- para uma posição física que nunca foi criada.
  if exists (
    select 1 from unnest(p_ruas || p_predios || p_niveis || p_apartamentos) as parte
     where parte like '%-%'
  ) then
    raise exception 'Nenhuma parte do endereço pode conter hífen: o hífen separa rua, prédio, nível e apartamento no código da posição.';
  end if;

  -- `on conflict do nothing` sobre o índice único (centro_id, codigo): repetir o
  -- lote com uma rua a mais cadastra só a rua nova, em vez de falhar inteiro.
  -- Endereçar um galpão é trabalho incremental, e o segundo lote quase sempre
  -- reaproveita o primeiro.
  with novos as (
    insert into public.estoque_enderecos (centro_id, rua, predio, nivel, apartamento)
    select p_centro_id, rua, predio, nivel, apartamento
      from unnest(p_ruas)         as rua,
           unnest(p_predios)      as predio,
           unnest(p_niveis)       as nivel,
           unnest(p_apartamentos) as apartamento
      -- Ordem fixa, e não a ordem em que as faixas chegaram: dois lotes
      -- concorrentes do mesmo centro que se cruzam (um manda A,B e o outro B,A)
      -- travariam linhas em ordens opostas e poderiam entrar em deadlock.
      order by rua, predio, nivel, apartamento
    on conflict do nothing
    returning 1
  )
  select count(*) into v_criados from novos;

  return v_criados;
end;
$$;

revoke all on function public.estoque_enderecos_criar_lote(uuid, text[], text[], text[], text[]) from public;
grant execute on function public.estoque_enderecos_criar_lote(uuid, text[], text[], text[], text[]) to authenticated;

comment on function public.estoque_enderecos_criar_lote(uuid, text[], text[], text[], text[]) is
  'Cria o produto cartesiano das quatro faixas como posições do centro, numa transação só. Devolve quantas foram criadas de fato; as que já existiam são puladas.';
