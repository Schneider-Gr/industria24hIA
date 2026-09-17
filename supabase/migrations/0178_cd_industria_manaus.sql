-- 0178: o CD do Indústria em Manaus passa a existir — Milestone 2 do PRD 039.
--
-- Endereço e CEP informados pela dona em 16/09/2026: Rua Marapatá, 40, Manaus/AM,
-- CEP 69088-067.
--
-- A LACUNA QUE ESTA MIGRATION RESOLVE, e que o PRD 039 não previu:
-- `centros_distribuicao.loja_id` é NOT NULL, e o tipo 'industria' introduzido
-- pela 0175 descreve um centro que é do marketplace, não de um seller. Não havia
-- de quem pendurá-lo: não existe nenhuma loja do marketplace em produção.
--
-- Das duas saídas possíveis, esta usa a menos invasiva: criar a loja do próprio
-- Indústria como dona do centro. A alternativa era tornar `loja_id` nulo para
-- centro 'industria', o que exigiria reescrever a RLS de centros_distribuicao e
-- de estoque_enderecos, que resolvem acesso por loja_id -> owner_id e acabaram de
-- entrar em produção. Trocar RLS em produção para evitar criar uma linha em
-- `lojas` seria o custo maior no lado errado.
--
-- Dono escolhido: industria24h@gmail.com, que é admin e **não tem nenhuma loja**.
-- Isso não é detalhe: `getMinhaLoja` resolve a loja do seller por
-- `owner_id ... limit 1`, então pendurar a loja do marketplace num admin que já
-- tem loja própria faria o painel dele passar a abrir a loja errada.
--
-- Situação 'Inativa' de propósito: a loja existe para ser dona do galpão e não
-- para vender. Não há diretório público de lojas (só /loja/[id] por id), as
-- listagens são todas de admin, e o checkout exige situacao = 'Ativa' para
-- vender, então esta loja não vende por construção, não só por convenção.

-- ============================================================
-- 1. A loja do marketplace
-- ============================================================

insert into public.lojas (owner_id, nome, situacao, permite_retirada_na_loja)
select 'b9cf6996-3a98-4b23-9685-f1445c155351'::uuid,
       'Indústria 24h — Centro de Distribuição',
       'Inativa',
       false
 where not exists (
   select 1 from public.lojas
    where nome = 'Indústria 24h — Centro de Distribuição'
 );

-- ============================================================
-- 2. O centro
-- ============================================================
-- Não é um insert: o trigger `lojas_criam_centro_padrao` (0175) já criou um
-- centro 'Estoque principal' para a loja nova, porque toda loja nasce com um
-- local padrão. Inserir um segundo deixaria um centro órfão de sobra com
-- `padrao = true` no lugar errado. Então o que se faz é converter o que o
-- invariante já criou.
--
-- O CEP entra no mesmo UPDATE que muda o tipo, e não depois: o trigger
-- `centro_industria_exige_cep` (0176) recusa centro 'industria' sem CEP, e com
-- razão — centro do marketplace sem CEP não pode ser origem de prazo nem de
-- coleta.
update public.centros_distribuicao c
   set nome        = 'CD Indústria Manaus',
       tipo        = 'industria',
       cep         = 69088067,
       localizacao = 'Rua Marapatá, 40 — Manaus/AM',
       status      = 'Ativo'
  from public.lojas l
 where l.id = c.loja_id
   and l.nome = 'Indústria 24h — Centro de Distribuição'
   and c.tipo = 'seller';

-- ============================================================
-- 3. O seller precisa ver o CD do Indústria
-- ============================================================
-- A policy da 0175/0176 mostra ao seller apenas centros da própria loja. O CD do
-- Indústria é de outra loja, então sem isto ele fica invisível justamente para
-- quem vai mandar mercadoria para lá.
--
-- Expõe só as linhas de tipo 'industria', e apenas leitura. O saldo de cada um
-- continua restrito pelo dono do produto (estoque_saldos_endereco, 0176): o
-- seller vê as posições do galpão e o que é dele dentro delas, nunca o que é de
-- outro seller.
drop policy if exists centros_industria_leitura_todos on public.centros_distribuicao;
create policy centros_industria_leitura_todos
  on public.centros_distribuicao for select
  to authenticated
  using (tipo = 'industria');

drop policy if exists estoque_enderecos_industria_leitura on public.estoque_enderecos;
create policy estoque_enderecos_industria_leitura
  on public.estoque_enderecos for select
  to authenticated
  using (
    exists (
      select 1 from public.centros_distribuicao c
       where c.id = estoque_enderecos.centro_id
         and c.tipo = 'industria'
    )
  );

-- ============================================================
-- 4. Verificação
-- ============================================================
-- Sem posições cadastradas: rua, prédio, nível e apartamento descrevem o galpão
-- físico, e inventá-los aqui seria dado falso do mesmo tipo que o CEP inventado.
-- Quem conhece o galpão cadastra na tela de /seller/centros.
do $$
declare
  v_id   uuid;
  v_cep  int;
  v_tipo text;
begin
  select c.id, c.cep, c.tipo into v_id, v_cep, v_tipo
    from public.centros_distribuicao c
    join public.lojas l on l.id = c.loja_id
   where l.nome = 'Indústria 24h — Centro de Distribuição';

  if v_id is null then
    raise exception '0178 abortada: o CD do Indústria não foi criado.';
  end if;
  if v_tipo <> 'industria' then
    raise exception '0178 abortada: o centro ficou com tipo %, esperado industria.', v_tipo;
  end if;
  if v_cep <> 69088067 then
    raise exception '0178 abortada: CEP do centro = %, esperado 69088067.', v_cep;
  end if;
end $$;
