-- 0196: campos da aba "Configurações" do afiliado logístico (paridade com o
-- painel /afiliadologistica do Bubble). CEP, telefone, peso suportado e valor
-- mínimo já existiam (cep_base, telefone, capacidade_kg, valor_minimo_entrega);
-- faltavam cidade, bairro, número e veículo. Pedido da dona em 25/09/2026.
-- RLS inalterada: parceiros_self_all (0039) já restringe ao próprio usuário.

alter table public.parceiros_logisticos
  add column if not exists cidade  text,
  add column if not exists bairro  text,
  add column if not exists numero  text,
  add column if not exists veiculo text;
