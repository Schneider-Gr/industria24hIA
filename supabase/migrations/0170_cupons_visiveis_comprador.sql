-- 0170: o comprador passa a enxergar os cupons que pode usar.
--
-- Até aqui `cupons`, `cupom_regras` e `cupom_usos` só tinham policy de admin
-- (0156) e de seller (0157): o comprador digitava um código no checkout às
-- cegas, sem tela para descobrir que o cupom existe. A página /cupons precisa
-- de leitura, nunca de escrita.
--
-- O recorte é deliberadamente estreito: só cupom ATIVO, dentro da validade e
-- sem o limite global estourado. Cupom expirado, desligado ou esgotado
-- continua invisível, então a tela não vira catálogo de código morto. Nada
-- aqui afeta a RPC de checkout, que valida de novo no servidor.

-- Cupons vigentes: qualquer usuário autenticado lê (o código é para ser usado).
create policy cupons_vigentes_leitura on public.cupons
  for select
  to authenticated
  using (
    ativo
    and now() between validade_inicio and validade_fim
    and (limite_global is null or usos < limite_global)
  );

-- As regras (percentual/valor e alvo) acompanham o cupom que já é legível.
create policy cupom_regras_leitura_vigente on public.cupom_regras
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.cupons c
      where c.id = cupom_regras.cupom_id
        and c.ativo
        and now() between c.validade_inicio and c.validade_fim
        and (c.limite_global is null or c.usos < c.limite_global)
    )
  );

-- Cada um vê os próprios usos, para a tela saber o que já foi resgatado e
-- respeitar limite_por_cliente sem chutar.
create policy cupom_usos_dono_leitura on public.cupom_usos
  for select
  to authenticated
  using (user_id = auth.uid());
