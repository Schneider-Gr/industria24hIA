-- Formaliza a coluna `situacao` de lojas (statusLoja no Bubble: Ativa/Inativa).
-- Existia como drift no projeto antigo (aplicada fora das migrations); os tipos
-- TS e ModerarSituacaoLoja já dependem dela.
alter table public.lojas
  add column if not exists situacao text not null default 'Ativa';
