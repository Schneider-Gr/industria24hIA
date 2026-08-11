-- 0116: confirma que a correção do cast seguro (uuid_ou_null) nas policies
-- do bucket 'disputas' não quebrou o padrão antigo de foto de abertura de
-- disputa (path {disputa_id}/{arquivo}, sem prefixo mediacao/, 0104).
-- begin/rollback, não altera nada de verdade.
begin;

insert into auth.users (id, email) values ('00000000-0000-4000-8000-00000000b001', 'e2e-regressao-comprador@test.local');
insert into public.lojas (id, owner_id, nome, cep, rua, numero, cidade, estado)
values ('00000000-0000-4000-8000-00000000b00a', '00000000-0000-4000-8000-00000000b001', 'Loja Regressao', '69000000', 'Rua A', '1', 'Manaus', 'AM');
update public.lojas set situacao='Ativa' where id='00000000-0000-4000-8000-00000000b00a';
insert into public.produtos (id, loja_id, nome, valor, estoque_atual, status_produto)
values ('00000000-0000-4000-8000-00000000b00b', '00000000-0000-4000-8000-00000000b00a', 'Produto Regressao', 10, 5, 'Aprovado');
insert into public.pedidos (id, id_venda, loja_id, cliente_id, status_pedido, valor_pedido)
values ('00000000-0000-4000-8000-00000000b00c', 'E2EREGRESSAO', '00000000-0000-4000-8000-00000000b00a', '00000000-0000-4000-8000-00000000b001', 'Pagamento Realizado', 10);
insert into public.linha_itens (pedido_id, produto_id, produto_nome, quantidade, valor)
values ('00000000-0000-4000-8000-00000000b00c', '00000000-0000-4000-8000-00000000b00b', 'Produto Regressao', 1, 10);
insert into public.conversas (id, comprador_id, loja_id, pedido_id)
values ('00000000-0000-4000-8000-00000000b00d', '00000000-0000-4000-8000-00000000b001', '00000000-0000-4000-8000-00000000b00a', '00000000-0000-4000-8000-00000000b00c');
insert into public.disputas (id, pedido_id, comprador_id, loja_id, conversa_id, motivo, descricao, status, sla_loja_vence_em)
values ('00000000-0000-4000-8000-00000000b00e', '00000000-0000-4000-8000-00000000b00c', '00000000-0000-4000-8000-00000000b001', '00000000-0000-4000-8000-00000000b00a', '00000000-0000-4000-8000-00000000b00d', 'produto_avariado', 'teste', 'aberta', now()+interval '1 day');

select set_config('request.jwt.claims', json_build_object('sub','00000000-0000-4000-8000-00000000b001','role','authenticated')::text, true);
set local role authenticated;

insert into storage.objects (bucket_id, name, owner)
values ('disputas', '00000000-0000-4000-8000-00000000b00e/foto-abertura.jpg', '00000000-0000-4000-8000-00000000b001');

select 'foto de abertura (padrao antigo) ainda funciona' as teste, count(*) = 1 as ok
from storage.objects where bucket_id='disputas' and name = '00000000-0000-4000-8000-00000000b00e/foto-abertura.jpg';

rollback;
