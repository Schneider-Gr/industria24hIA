-- Decisões do dono em 11/09/2026 (issue #589).
--
-- 1. Frete ativo no Rio Grande do Sul. A faixa de UF da 0165 entrou com
--    ativo = false (só cobertura), então comprador de Porto Alegre via o
--    produto da loja construção mas o checkout_criar_pedido recusava entrega.
--    Percentual 10 e kg_adicional 0: o mesmo das outras faixas globais ativas
--    sem transportadora (Manaus, Acre, DF/GO). As demais UFs seguem inativas.
update faixas_cep
   set ativo = true, percentual = 10, kg_adicional = 0
 where id = '208c305d-9714-4880-a145-85ae34c96bbb'   -- Rio Grande do Sul (RS)
   and cep_inicial = 90000000 and cep_final = 99999999;

-- 2. Cerâmica Iguatú fica em Rio Branco/AC, mas o backfill da 0167 declarou
--    "Manaus e região (AM)" nos produtos dela. Troca pela faixa do Acre, na
--    tabela N:N (0169) e na FK legada que as RPCs de frete ainda leem.
insert into produto_faixas_cep (produto_id, faixa_cep_id)
select pf.produto_id, '814583a7-47fe-472e-9942-d043b859a120'          -- Acre (AC)
  from produto_faixas_cep pf join produtos p on p.id = pf.produto_id
 where p.loja_id = '3b30b0da-1fd9-4010-a75e-bb3f899f196d'              -- Cerâmica Iguatú
   and pf.faixa_cep_id = 'be90fff2-8165-4488-8455-d337beb40504'        -- Manaus e região (AM)
on conflict do nothing;

delete from produto_faixas_cep pf
 using produtos p
 where p.id = pf.produto_id
   and p.loja_id = '3b30b0da-1fd9-4010-a75e-bb3f899f196d'
   and pf.faixa_cep_id = 'be90fff2-8165-4488-8455-d337beb40504';

update produtos
   set faixa_cep_id = '814583a7-47fe-472e-9942-d043b859a120'
 where loja_id = '3b30b0da-1fd9-4010-a75e-bb3f899f196d'
   and faixa_cep_id = 'be90fff2-8165-4488-8455-d337beb40504';
