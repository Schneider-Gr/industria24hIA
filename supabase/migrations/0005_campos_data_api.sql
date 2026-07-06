-- Campos confirmados na extração real da Data API (2026-07-06) que faltavam
-- no schema v1 — ver docs/data-api-reconciliation.md. Sem eles a migração de
-- dados perde rastro financeiro (Asaas) e logístico (entrega por item).

-- Pedido: cobrança Asaas + pagamento (PedidosVendedor)
alter table public.pedidos
  add column if not exists asaas_cobranca_id text,          -- "ID Cobrança_asaas"
  add column if not exists link_cobranca     text,          -- LinkCobranca
  add column if not exists forma_pagamento   text,          -- PIX/BOLETO/...
  add column if not exists dt_pagamento      timestamptz,   -- "Dt.Pagamento"
  add column if not exists repasse_ind24     numeric(12,2), -- repasse do pedido
  add column if not exists valor_recebido_industria text;   -- status Asaas (RECEIVED...)

-- Item: entrega/endereço/frete e repasse do vendedor (item_para_compra)
alter table public.linha_itens
  add column if not exists cod_entrega        text,
  add column if not exists data_entrega       timestamptz,
  add column if not exists dt_pagamento_cliente timestamptz,
  add column if not exists valor_frete        numeric(12,2),
  add column if not exists retirar_na_loja    boolean not null default false,
  add column if not exists repasse_vendedor   numeric(12,2),
  add column if not exists entrega_cep        text,
  add column if not exists entrega_rua        text,
  add column if not exists entrega_bairro     text,
  add column if not exists entrega_numero     text,
  add column if not exists entrega_cidade     text,
  add column if not exists entrega_complemento text,
  add column if not exists centro_id          uuid references public.centros_distribuicao (id);

-- Loja: campos com dados reais sem destino (Loja_ecommerce)
alter table public.lojas
  add column if not exists razao_social        text,
  add column if not exists valor_pedido_minimo numeric(12,2);
