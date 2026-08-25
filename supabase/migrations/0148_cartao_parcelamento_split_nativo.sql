-- 0148: infraestrutura para cartão de crédito parcelado e split nativo Asaas
-- (walletId), como continuação restrita a CARTÃO da decisão de reabertura
-- registrada em [[industria24h-split-nativo-cartao-parcelamento]] — o split
-- nativo geral (PIX/Boleto) segue descartado (ver comentário da 0111);
-- aqui ele existe SÓ para lojas que já têm asaas_wallet_id preenchido
-- (onboarding de subconta é manual/admin por ora — não inventado nesta
-- migration, ver ⚠️ PENDENTE no PR).

alter table public.lojas
  add column if not exists asaas_wallet_id text;

comment on column public.lojas.asaas_wallet_id is
  'walletId da subconta Asaas do lojista. Preenchido manualmente por admin até existir onboarding self-service. Quando presente, cartão de crédito passa a usar split nativo Asaas em vez do ledger de repasse manual.';

alter table public.pedidos
  add column if not exists parcelas smallint not null default 1,
  add column if not exists split_nativo_aplicado boolean not null default false;

comment on column public.pedidos.parcelas is
  'Número de parcelas do cartão de crédito escolhido no checkout (1 = à vista). Só relevante para forma_pagamento = CREDIT_CARD.';
comment on column public.pedidos.split_nativo_aplicado is
  'true quando a cobrança foi criada com split nativo Asaas (walletId da loja) — repasses_recalcular_pedido não deve gerar repasse "pendente" de seller para este pedido, pois o valor já foi enviado direto pela Asaas no momento do pagamento.';

alter table public.pedidos
  add constraint pedidos_parcelas_check check (parcelas >= 1 and parcelas <= 12);

-- repasses_recalcular_pedido (0111) já ignora pedidos com repasse não mais
-- 'pendente' via `on conflict ... where status = 'pendente'`. Para split
-- nativo o app grava a linha de repasse do seller como 'transferido' no
-- momento da confirmação de pagamento (asaas-confirmar.ts), então nenhuma
-- mudança de SQL é necessária aqui além das colunas acima — o guard
-- existente já cobre o caso.
