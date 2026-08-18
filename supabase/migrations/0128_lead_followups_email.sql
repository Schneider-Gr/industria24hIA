-- Follow-up de lead por e-mail (issue #141, spec: "condicionado à validação
-- do domínio no Resend") — domínio validado, canal deixa de ser mockado com
-- mensagem de "integração pendente" e passa a permitir envio real.

alter table public.lead_followups
  drop constraint lead_followups_canal_check,
  add constraint lead_followups_canal_check check (canal in ('whatsapp', 'email'));
