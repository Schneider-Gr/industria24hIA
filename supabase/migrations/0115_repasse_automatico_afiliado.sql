-- 0115: fecha o D-E4.1 deixado em aberto pela 0111 — adiciona chave PIX
-- para afiliado (não existia tabela de "afiliados"; a identidade do
-- afiliado é o próprio auth.users.id usado em afiliacoes.afiliado_id /
-- linha_itens.afiliado_id / repasses.afiliado_id) e generaliza o repasse
-- automático (Processo 2 de docs/e4-split-repasse-bpmn.md) para também
-- transferir a comissão do afiliado, não só do seller.
--
-- Mesmo modelo de segurança da 0035 (chave_pix_protegida): troca só pela
-- RPC dedicada, carência de 24h antes de a chave nova ficar elegível para
-- repasse automático, log em auditoria_eventos.

create table if not exists public.afiliado_dados_pix (
  afiliado_id uuid primary key references auth.users(id) on delete cascade,
  chave_pix text,
  tipo_chave_pix text,
  chave_pix_confirmada_em timestamptz,
  created_at timestamptz not null default now()
);

alter table public.afiliado_dados_pix enable row level security;

create policy afiliado_dados_pix_self_select on public.afiliado_dados_pix
  for select using (auth.uid() = afiliado_id or public.is_admin());

-- Sem policy de insert/update: escrita só pela RPC abaixo (security definer).

-- ============ RPC dedicada de troca (auth.uid() = próprio afiliado) ============
create or replace function public.alterar_chave_pix_afiliado(
  p_chave_pix text,
  p_tipo_chave_pix text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_antes record;
  v_digitos text;
begin
  if auth.uid() is null then
    raise exception 'Faça login para alterar a chave PIX.';
  end if;
  if p_tipo_chave_pix not in ('CNPJ', 'CPF', 'EMAIL', 'PHONE') then
    raise exception 'Tipo de chave PIX inválido.';
  end if;
  if p_chave_pix is null or length(trim(p_chave_pix)) = 0 then
    raise exception 'Chave PIX não pode ser vazia.';
  end if;

  v_digitos := regexp_replace(p_chave_pix, '\D', '', 'g');
  if p_tipo_chave_pix = 'CPF' and length(v_digitos) <> 11 then
    raise exception 'CPF inválido: deve ter 11 dígitos.';
  elsif p_tipo_chave_pix = 'CNPJ' and length(v_digitos) <> 14 then
    raise exception 'CNPJ inválido: deve ter 14 dígitos.';
  elsif p_tipo_chave_pix = 'EMAIL' and p_chave_pix !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'E-mail inválido.';
  elsif p_tipo_chave_pix = 'PHONE' and length(v_digitos) not between 10 and 13 then
    raise exception 'Telefone inválido.';
  end if;

  select chave_pix, tipo_chave_pix into v_antes
  from public.afiliado_dados_pix where afiliado_id = auth.uid();

  insert into public.afiliado_dados_pix (afiliado_id, chave_pix, tipo_chave_pix, chave_pix_confirmada_em)
  values (auth.uid(), p_chave_pix, p_tipo_chave_pix, null)
  on conflict (afiliado_id) do update
    set chave_pix = excluded.chave_pix,
        tipo_chave_pix = excluded.tipo_chave_pix,
        chave_pix_confirmada_em = null; -- reinicia carência a cada troca

  insert into auditoria_eventos (ator_id, ator_papel, acao, tabela, registro_id, dados_antes, dados_depois)
  values (auth.uid(), 'afiliado', 'chave_pix.alterada', 'afiliado_dados_pix', auth.uid(),
          jsonb_build_object('chave_pix', v_antes.chave_pix, 'tipo_chave_pix', v_antes.tipo_chave_pix),
          jsonb_build_object('chave_pix', p_chave_pix, 'tipo_chave_pix', p_tipo_chave_pix));
end;
$$;

revoke all on function public.alterar_chave_pix_afiliado(text, text) from public;
grant execute on function public.alterar_chave_pix_afiliado(text, text) to authenticated;

-- ============ Elegibilidade (mesma carência de 24h da 0035) ============
create or replace function public.chave_pix_elegivel_repasse_afiliado(p_afiliado_id uuid)
returns boolean
language sql
stable
as $$
  select chave_pix is not null
     and chave_pix_confirmada_em is not null
     and chave_pix_confirmada_em <= now() - interval '24 hours'
  from public.afiliado_dados_pix where afiliado_id = p_afiliado_id;
$$;

create or replace function public.confirmar_chave_pix_afiliado(p_afiliado_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (auth.uid() is null or public.is_admin()) then
    raise exception 'Apenas admin ou service_role confirmam chave PIX.';
  end if;
  update public.afiliado_dados_pix set chave_pix_confirmada_em = now() where afiliado_id = p_afiliado_id;
end;
$$;

revoke all on function public.confirmar_chave_pix_afiliado(uuid) from public;
grant execute on function public.confirmar_chave_pix_afiliado(uuid) to authenticated;
