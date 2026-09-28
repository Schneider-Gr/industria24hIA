-- 0206: mensagem automática no chat (PRD 050, US09).
--
-- Quando o pedido com frete combinado é pago, a conversa abre com o resumo do
-- que foi combinado na cotação. Essa mensagem não tem autor humano: autor_id
-- passa a aceitar null só quando automatica = true. As policies de insert
-- continuam exigindo autor_id = auth.uid(), então nenhum usuário grava
-- mensagem automática; só a service role (confirmação de pagamento).

alter table public.mensagens
  add column if not exists automatica boolean not null default false;

alter table public.mensagens
  alter column autor_id drop not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'mensagens_autor_ou_automatica') then
    alter table public.mensagens
      add constraint mensagens_autor_ou_automatica
      check (autor_id is not null or automatica);
  end if;
end $$;
