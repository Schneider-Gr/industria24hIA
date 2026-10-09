-- 0219 — change montador-faixas-custo-frete (09/10/2026), design D7: a curva da venda
-- futura aceita até 6 degraus (a planilha real do seller usa 5 e 6). Recria o trigger a
-- partir da 0218 trocando só o limite.

create or replace function public.vendas_futuras_curva_valida()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  d jsonb;
  v_ant_dias int;
  v_ant_pct int;
begin
  if jsonb_typeof(new.curva) <> 'array' then
    raise exception 'A curva precisa ser uma lista de degraus.';
  end if;
  if jsonb_array_length(new.curva) > 6 then
    raise exception 'A curva aceita no máximo 6 degraus.';
  end if;
  for d in select e from jsonb_array_elements(new.curva) e order by (e->>'dias_antes')::numeric desc loop
    if jsonb_typeof(d->'dias_antes') <> 'number' or (d->>'dias_antes')::numeric <> trunc((d->>'dias_antes')::numeric)
       or (d->>'dias_antes')::int <= 0 then
      raise exception 'Os dias de cada degrau precisam ser um número inteiro maior que zero.';
    end if;
    if jsonb_typeof(d->'desconto_pct') <> 'number' or (d->>'desconto_pct')::numeric <> trunc((d->>'desconto_pct')::numeric)
       or (d->>'desconto_pct')::int not between 1 and 90 then
      raise exception 'O desconto de cada degrau precisa ser um número inteiro de 1 a 90%%.';
    end if;
    if v_ant_dias is not null then
      if (d->>'dias_antes')::int = v_ant_dias then
        raise exception 'Há degraus com dias repetidos.';
      end if;
      if (d->>'desconto_pct')::int > v_ant_pct then
        raise exception 'O degrau mais distante da entrega precisa ter desconto maior ou igual ao seguinte.';
      end if;
    end if;
    v_ant_dias := (d->>'dias_antes')::int;
    v_ant_pct := (d->>'desconto_pct')::int;
  end loop;
  return new;
end;
$$;
