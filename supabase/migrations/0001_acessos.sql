-- Tabela `acessos` — único Data Type do Bubble com campos 100% confirmados
-- (ver docs/database.md, seção "Campos Confirmados").
-- Regra 8 do projeto: nasce com RLS ativado e SEM policy de leitura pública.
-- Deny-by-default: liberar acesso só quando houver regra documentada/confirmada.

create table if not exists public.acessos (
  id            uuid primary key default gen_random_uuid(),
  data_horario  timestamptz,              -- Bubble: data_horario (date)
  geral         text,                     -- Bubble: geral (text)
  pagina        text,                     -- Bubble: pagina (text)
  user_id       uuid references auth.users (id) on delete set null, -- Bubble: user (User)
  created_at    timestamptz not null default now(), -- Bubble: Created Date (built-in)
  modified_at   timestamptz not null default now(), -- Bubble: Modified Date (built-in)
  slug          text                      -- Bubble: Slug (built-in)
);

comment on table public.acessos is
  'Log de acessos. Migrado do Data Type Bubble `acessos` (Público no Bubble, mas RLS deny-by-default aqui — ver docs/privacy-rules.md).';

alter table public.acessos enable row level security;

-- ponytail: sem policy de propósito. `acessos` era "Público" no Bubble por
-- ausência de Privacy Rule, o que NÃO significa que deve ser lido por anon aqui.
-- A policy correta depende da Privacy Rule real (ainda não capturada). Até lá,
-- só service_role (que ignora RLS) escreve/lê. Adicionar policy quando a regra
-- estiver confirmada em docs/privacy-rules.md.

create index if not exists acessos_user_id_idx on public.acessos (user_id);
create index if not exists acessos_data_horario_idx on public.acessos (data_horario desc);
