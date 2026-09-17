-- 0183: fecha o acesso anônimo a funções `security definer` que não deviam
-- aceitá-lo, e corrige um vazamento de telefone de parceiro logístico.
--
-- Causa-raiz, confirmada em `pg_default_acl`: o schema `public` concede
-- `anon=X` para toda função nova, por `postgres` e por `supabase_admin`. O
-- `revoke all on function ... from public` que as migrations fazem não desfaz
-- isso, porque o grant é nominal a `anon`, e não a `PUBLIC`. Toda função
-- `security definer` do projeto nasce, portanto, chamável por
-- `POST /rest/v1/rpc/<nome>` sem nenhuma credencial.
--
-- Nem toda função exposta é um problema: as quatro `estoque_endereco_*` e a
-- `pedido_cancelar_devolver_estoque` já recusam quem não está autenticado na
-- primeira linha, e para elas o acesso anônimo não produz efeito nenhum. O que
-- esta migration trata são as que produzem.

-- ============================================================
-- 1. Vazamento de telefone de parceiro logístico
-- ============================================================
-- `parceiros_disponiveis_loja` é `security definer` e o segundo ramo do
-- `union all` NÃO filtra por `p_loja_id`: devolve nome, telefone e nota de todo
-- parceiro com status Aprovado. Como a tabela tem RLS com apenas
-- `parceiros_admin_all` e `parceiros_self_all`, o anônimo não lê nada por ela;
-- a função era o caminho aberto. Qualquer UUID servia de argumento, inclusive
-- um que não existe.
--
-- A listagem de todos os parceiros aprovados é intencional (é assim que a loja
-- escolhe com quem trabalhar), então o que muda não é o conjunto devolvido: é
-- quem pode pedir. Passa a exigir sessão e posse da loja consultada, no mesmo
-- padrão das funções de endereço da 0176.
create or replace function public.parceiros_disponiveis_loja(p_loja_id uuid)
returns table(origem text, id uuid, nome text, telefone text, nota_media numeric)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Faça login para consultar parceiros logísticos.';
  end if;

  -- Dono da loja, ou admin. Resolvido por `owner_id`, e não por policy de
  -- leitura: `lojas_public_read` combina por OR e deixaria passar loja alheia.
  if not exists (
    select 1 from public.lojas l where l.id = p_loja_id and l.owner_id = v_user
  ) and not exists (
    select 1 from public.admins a where a.user_id = v_user
  ) then
    raise exception 'Loja não encontrada para este usuário.';
  end if;

  return query
    select 'afiliado'::text, a.afiliado_id, coalesce(pl.nome, 'Afiliado logístico'),
           pl.telefone, pl.nota_media
      from afiliacoes a
      left join parceiros_logisticos pl on pl.user_id = a.afiliado_id
     where a.loja_id = p_loja_id and a.tipo = 'logistica' and a.status = 'Aprovada'
    union all
    select 'parceiro'::text, pl.id, pl.nome, pl.telefone, pl.nota_media
      from parceiros_logisticos pl
     where pl.status = 'Aprovado';
end;
$$;

-- ============================================================
-- 2. Revogação pontual do acesso anônimo
-- ============================================================
-- Só as que causam efeito sem credencial. Cada `revoke` abaixo tem um motivo
-- próprio, e nenhuma delas é chamada por visitante deslogado no app.

-- Escreve na trilha de auditoria de API: um anônimo forjava linha em
-- `api_audit_log` com qualquer key_id/loja_id e carimbava `ultimo_uso` em
-- qualquer chave. Registro forjado na tabela que se usa para investigar
-- incidente é pior que registro ausente.
revoke execute on function public.api_registrar_uso(uuid, uuid, text, jsonb, boolean, text, text) from anon;

-- Oráculo de validação de credencial de parceiro: confirma, para um hash dado,
-- o key_id, a loja e o escopo, contornando a RLS de `api_keys`. Exige conhecer
-- o hash, então não vaza sozinha, mas é um verificador de credencial aberto.
revoke execute on function public.api_validar_token(text, text) from anon;

-- Escreve evento arbitrário em qualquer compra coletiva, com tipo e payload
-- livres. Não escala privilégio, polui o mural.
revoke execute on function public.coletiva_evento(uuid, text, jsonb) from anon;

-- Não permite escolher o que cancelar (só toca reserva já vencida de pedido em
-- Aguardando Pagamento), mas com `p_produto_id => null` varre todas as reservas
-- vencidas e roda devolução de estoque e liberação de cupom em laço, sem
-- limite. É trabalho de escrita pesado e gratuito para quem chama sem se
-- identificar. O cron usa `service_role` e o checkout a chama de dentro de
-- outra `security definer`, então nenhum caminho real depende deste grant.
revoke execute on function public.estoque_reservas_expirar(uuid) from anon;

-- Defesa em profundidade na função de parceiros: a guarda de sessão acima já
-- recusa o anônimo, mas não há motivo para ela sequer ser alcançável sem
-- credencial. Os dois chamadores reais são server actions do painel do seller.
revoke execute on function public.parceiros_disponiveis_loja(uuid) from anon;

-- `authenticated` também sai destas três. Nenhum caminho do app as chama com
-- sessão de usuário: as duas de API não têm chamador no código, e a expiração
-- é chamada pelo cron com `service_role` (`src/app/api/estoque/reservas/
-- expirar/route.ts`, via `createServiceClient`) ou por dentro do checkout, que
-- é `security definer` e não depende do grant de quem chamou.
revoke execute on function public.api_validar_token(text, text) from authenticated;
revoke execute on function public.api_registrar_uso(uuid, uuid, text, jsonb, boolean, text, text) from authenticated;
revoke execute on function public.estoque_reservas_expirar(uuid) from authenticated;

-- ============================================================
-- 3. Função nova deixa de nascer aberta
-- ============================================================
-- Sem isto, a próxima migration recria o problema sem ninguém perceber: quem
-- escreve `revoke ... from public` acredita ter fechado, e o default reabre.
-- Depois daqui, expor uma função ao público passa a exigir `grant execute ...
-- to anon` explícito, que é uma linha que se lê na revisão.
-- Dois roles concedem: `postgres` e `supabase_admin` (ver `pg_default_acl`), e
-- `alter default privileges` sem `for role` só mexe no da sessão. Revogar um e
-- achar que fechou é o mesmo engano do `revoke ... from public`.
alter default privileges for role postgres in schema public revoke execute on functions from anon;

do $$
begin
  -- `supabase_admin` costuma estar fora do alcance do papel que aplica
  -- migrations. Se estiver, avisa em vez de derrubar a migration: os revokes
  -- pontuais acima, que são o que fecha o risco de hoje, já terão sido
  -- aplicados. O que sobra é função FUTURA nascer aberta, e isso é tarefa de
  -- quem tem o papel, registrada no PR.
  execute 'alter default privileges for role supabase_admin in schema public revoke execute on functions from anon';
exception when insufficient_privilege or others then
  raise warning 'Não foi possível revogar o default privilege de supabase_admin: %. Função nova ainda nascerá executável por anon; abrir tarefa com quem tem o papel.', sqlerrm;
end $$;

comment on function public.parceiros_disponiveis_loja(uuid) is
  'Parceiros logísticos disponíveis para a loja. Exige sessão e posse da loja (ou admin): devolve telefone de parceiro, que é PII protegida por RLS na tabela.';
