-- 0152: loja nova nasce 'EmAnalise' e só entra na vitrine após aprovação do admin.
--
-- Estado atual (auditado por leitura das migrations, 27/08/2026):
--   - 0006 define lojas.situacao com default 'Ativa'.
--   - 0033 adiciona `lojas_situacao_check check (situacao in ('Ativa','Inativa'))`
--     — 'EmAnalise' NUNCA foi um valor válido no banco (grep de EmAnalise nas
--     migrations = 0 ocorrências).
--   - 0017 tinha um guard de INSERT (`if new.situacao = 'Ativa' then raise`),
--     perdido quando 0104/0109 reconstruíram guard_campos_restritos() mantendo
--     só o branch de UPDATE para `lojas`.
--   Resultado: salvarLoja (seller/minha-loja/actions.ts) insere sem `situacao`,
--   assume o default 'Ativa', e a loja aparece na vitrine sem passar pelo admin.
--   A UI de moderação do admin (admin/layout.tsx conta situacao='EmAnalise';
--   admin/lojas/actions.ts SITUACOES inclui 'EmAnalise') referencia um estado
--   que a constraint proíbe.
--
-- Esta migration NÃO reescreve guard_campos_restritos() de propósito: ela já
-- cobre o UPDATE de `situacao` (só-admin), e reescrevê-la exigiria o texto exato
-- vigente em produção e colidiria com PRs de migration em voo (#462: 0150/0151).
-- O guard de INSERT vira um trigger dedicado.

-- 1. 'EmAnalise' passa a ser um valor de domínio válido.
alter table public.lojas drop constraint if exists lojas_situacao_check;
alter table public.lojas
  add constraint lojas_situacao_check check (situacao in ('Ativa', 'Inativa', 'EmAnalise'));

-- 2. Loja nova nasce em análise.
alter table public.lojas alter column situacao set default 'EmAnalise';

-- 3. Guard de INSERT: não-admin não cria loja com situacao != 'EmAnalise'.
--    Libera auth.uid() nulo (service_role/postgres), admin, e o bypass das RPCs
--    de checkout (app.checkout_rpc) — mesmo padrão de guard_campos_restritos().
create or replace function public.guard_loja_insert_moderacao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null
     or public.is_admin()
     or coalesce(current_setting('app.checkout_rpc', true), '') = 'on' then
    return new;
  end if;

  if new.situacao is distinct from 'EmAnalise' then
    raise exception 'Loja nova nasce EmAnalise; a aprovação é do admin.';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_loja_insert_moderacao on public.lojas;
create trigger guard_loja_insert_moderacao
  before insert on public.lojas
  for each row execute function public.guard_loja_insert_moderacao();

-- Lojas já existentes NÃO são alteradas: quem está 'Ativa' continua 'Ativa'.
-- Só o default e o comportamento de INSERT mudam daqui pra frente.
