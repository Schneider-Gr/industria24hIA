-- 0126: hardening real (security_barrier) das outras 4 views que o advisor
-- "Security Definer View" aponta, mesmo padrão da 0124:
--
-- pedidos_cliente / linha_itens_cliente (0027, refinadas em 0071/0105/0118):
--   substituem pedidos_cliente_read/linha_itens_cliente_read (dropadas na
--   própria 0027), filtram por `cliente_id = auth.uid()`.
-- parceiros_publicos (0039): perfil público mínimo (nome/tipo/nota) do
--   parceiro logístico Aprovado — sem RLS pública na tabela base.
-- coletiva_pagamentos (0071): só contagens agregadas, zero PII de
--   participante.
--
-- INVESTIGADO E DESCARTADO: security_invoker=true + RLS equivalente na
-- tabela base (o "fix" que faria o aviso sumir de verdade). Não é viável
-- neste projeto porque anon/authenticated são papéis ÚNICOS compartilhados
-- por todos os usuários daquele tipo no Supabase/PostgREST — não existe
-- role por usuário. GRANT de coluna restringe o papel inteiro, não por
-- linha: cortaria o acesso legítimo do seller autenticado, que usa o MESMO
-- papel `authenticated` para ler a própria loja/pedido por INTEIRO
-- (lojas_owner_all, pedidos_owner_all). E reabrir a RLS de linha que
-- existia antes da view (ex.: lojas_public_read on situacao='Ativa')
-- reabre o vazamento de PII que motivou trocar a policy pela view (0012):
-- qualquer `select *` direto na tabela via PostgREST voltaria a expor
-- CNPJ/PIX/e-mail. Resolver de verdade exigiria fragmentar `authenticated`
-- em papéis de banco mais granulares — mudança de arquitetura, fora de
-- escopo. O aviso do advisor é falso positivo estrutural para esse padrão;
-- security_barrier=true é o hardening real disponível sem regressão.
alter view public.pedidos_cliente set (security_barrier = true);
alter view public.linha_itens_cliente set (security_barrier = true);
alter view public.parceiros_publicos set (security_barrier = true);
alter view public.coletiva_pagamentos set (security_barrier = true);
