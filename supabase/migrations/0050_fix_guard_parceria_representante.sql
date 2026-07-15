-- 0050: fix do guard de 0049 — a decisão de aprovar/recusar uma parceria de
-- representante é do PRÓPRIO SELLER (dono da loja), não de admin. O guard
-- financeiro genérico (0049) barrava o botão Aprovar/Recusar da página
-- /seller/parceiro-logistica por engano (achado antes do primeiro uso real).
-- Crédito continua exclusivo de admin (dado financeiro sensível).

drop trigger guard_parceria_status on public.parcerias_representante;

create or replace function public.guard_status_parceria_representante()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    -- admin sempre pode; dono da loja decide Aprovada/Recusada; representante cancela a própria
    if public.is_admin() then
      return new;
    end if;
    if exists (select 1 from public.lojas l where l.id = new.loja_id and l.owner_id = auth.uid())
       and new.status in ('Aprovada','Recusada') then
      return new;
    end if;
    if old.representante_id = auth.uid() and old.status = 'Pendente' and new.status = 'Cancelada' then
      return new;
    end if;
    raise exception 'Sem permissão para alterar o status desta parceria.';
  end if;
  return new;
end; $$;

create trigger guard_parceria_status
  before update on public.parcerias_representante
  for each row execute function public.guard_status_parceria_representante();
