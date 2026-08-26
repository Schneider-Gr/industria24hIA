-- 0145: parcelamento de cartão de crédito no checkout Asaas.
-- Coluna nova, sem impacto em guard_campos_restritos (0012) — não é campo
-- financeiro sensível, e o comprador só grava no momento da criação do
-- pedido (nunca em update posterior).
alter table public.pedidos
  add column if not exists parcelas smallint not null default 1
    check (parcelas between 1 and 12);
