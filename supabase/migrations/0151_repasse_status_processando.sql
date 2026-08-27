-- 0151: adiciona o status `processando` a repasses, para o claim atômico
-- que src/lib/repasses.ts passa a fazer antes de createPixTransfer (achado
-- T2 da auditoria do caminho do dinheiro, 27/08 — spec change
-- confiabilidade-caminho-dinheiro-pos-checkout).
--
-- T1 (repasse ao seller pago em dobro por unique constraint que não pega
-- afiliado_id NULL) JÁ ESTÁ RESOLVIDO EM PRODUÇÃO por
-- 0147_fix_repasses_dedup_afiliado_id_nulo.sql (originalmente 0115, issue
-- #357): dois índices parciais `repasses_seller_uniq` / `repasses_afiliado_uniq`
-- + dedup + `repasses_recalcular_pedido` com ON CONFLICT parcial correto.
-- Verificado via SQL editor em 27/08: os índices e a função corrigida
-- existem em prod. Esse fix está preso em worktree-minhas-compras com
-- colisão de número (master tem outro 0147) e precisa ser renumerado e
-- mergeado à parte — não é escopo desta migration nem da PR #462.
--
-- Por isso 0151 NÃO recria repasses_recalcular_pedido (a versão de prod é a
-- correta; a de master/0111 tem ON CONFLICT sem o predicado parcial e
-- quebra com 42P10 no bloco de afiliado) nem os índices (já existem).

-- Nome do check inline da 0084 pode variar por instância; dropa por descoberta.
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.repasses'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.repasses drop constraint %I', c);
  end loop;
end;
$$;

alter table public.repasses
  add constraint repasses_status_check
  check (status in ('pendente', 'processando', 'transferido', 'falhou', 'inelegivel', 'estornado'));
