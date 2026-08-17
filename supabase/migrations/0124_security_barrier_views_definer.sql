-- 0124: hardening do advisor "Security Definer View" (lojas_vitrine,
-- afiliado_ganhos, logistica_pedidos, logistica_itens).
--
-- As 4 views são SECURITY DEFINER DE PROPÓSITO: cada uma substituiu uma RLS
-- policy que vazava PII/financeiro (0012 derrubou lojas_public_read, 0013
-- derrubou linha_itens_afiliado_read, 0015 nunca deu RLS ao afiliado
-- logístico) — o filtro de tenant (situacao='Ativa' / afiliado_id=auth.uid() /
-- eh_afiliado_logistica()) mora no WHERE da própria view. Ligar
-- security_invoker=true (o fix padrão do advisor) faria a RLS da tabela base
-- ser aplicada TAMBÉM, e como essa RLS foi removida/nunca existiu para esses
-- papéis, as views passariam a devolver 0 linhas — quebra vitrine pública e
-- os dois painéis de afiliado. O advisor é falso positivo para esse padrão.
--
-- Fix real: security_barrier=true. Sem isso, o planner pode empurrar uma
-- função do lado do consumidor (ex.: `select * from afiliado_ganhos where
-- minha_func(valor)`) para ANTES do filtro `afiliado_id = auth.uid()` da
-- view, vazando linhas de outros afiliados via side-channel (erro/timing) de
-- uma função marcada leaky. security_barrier força o filtro da view a rodar
-- primeiro sempre.
alter view public.lojas_vitrine set (security_barrier = true);
alter view public.afiliado_ganhos set (security_barrier = true);
alter view public.logistica_pedidos set (security_barrier = true);
alter view public.logistica_itens set (security_barrier = true);
