-- 0130: hardening real (security_barrier) das últimas 3 views que o advisor
-- "Security Definer View" aponta, mesmo padrão da 0124/0126.
--
-- favoritos_contagem (0096) / avaliacoes_produto_resumo (0097) /
-- coletiva_participantes_total (0100): agregações públicas (count/avg) sobre
-- tabelas com RLS "dono só vê a própria linha" — a view precisa contornar
-- essa RLS de propósito para expor a contagem/média pública sem expor QUEM
-- favoritou/avaliou/participou. security_invoker=true reaplicaria a RLS da
-- tabela base e zeraria os agregados para anon/authenticated. Nenhuma expõe
-- PII (só produto_id/coletiva_id + número), então o risco do falso positivo
-- é baixo, mas security_barrier=true fecha o mesmo side-channel via
-- planner descrito na 0124.
alter view public.favoritos_contagem set (security_barrier = true);
alter view public.avaliacoes_produto_resumo set (security_barrier = true);
alter view public.coletiva_participantes_total set (security_barrier = true);
