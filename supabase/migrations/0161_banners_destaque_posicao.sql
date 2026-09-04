-- Faixa de banners cadastráveis em dois pontos da home:
--   'topo' = faixa "Destaques da indústria" já existente (após Supermercado);
--   'meio' = nova faixa entre "Produtos recentes" e a galeria de Supermercado.
-- Sem posicao definida, o banner continua na faixa atual ('topo').

alter table public.banners_destaque
  add column if not exists posicao text not null default 'topo';

alter table public.banners_destaque
  drop constraint if exists banners_destaque_posicao_check;

alter table public.banners_destaque
  add constraint banners_destaque_posicao_check
  check (posicao in ('topo', 'meio'));

create index if not exists banners_destaque_posicao_idx
  on public.banners_destaque (posicao, ordem);

notify pgrst, 'reload schema';
