# Spec técnica: PRD 039, US04 (separação e expedição)

Status: proposta, 18/09/2026. Nada disto está no banco. Depende da `0187`.

## Restrições herdadas (não reabrir)

- `produtos.estoque_atual` é o **disponível**. A saída no ledger acontece na criação do pedido (`checkout_criar_pedido`, 0177), e a expedição **não** gera lançamento novo: só muda a reserva para `consumida` (0177 §9 do 036).
- Centro `tipo = 'industria'` recusa lançamento sem endereço (`estoque_movimento_valida_endereco`, 0176) e recusa produto apontado para ele até o M3 (`produto_centro_recusa_industria`, 0179).
- Reserva: `ativa` → `confirmada` (pago/em separação) → `consumida` (enviado ou entregue, 0187) ou `liberada` (cancelado, expirado).
- Status de pedido admitidos: `Aguardando Pagamento`, `Pagamento Realizado`, `Em Separação`, `Enviado`, `Cancelado`. A US04 não cria status novo de pedido.

## Consequência de desenho

Como a saída do ledger é na criação do pedido e o CD do Indústria exige endereço em todo lançamento, **o endereço de origem é escolhido no checkout**, não na separação. A saída do checkout para produto em custódia passa a levar `endereco_id`, alocado FIFO (posição não bloqueada com saldo, mais antiga primeiro), podendo quebrar em mais de um endereço. Assim `estoque_saldos_endereco` já reflete o que foi prometido e a separação só confirma fisicamente o que o sistema já alocou.

Alternativa descartada: reservar sem endereço e baixar o endereço na expedição. Exigiria um segundo livro (físico × disponível) que a 0177 recusou de propósito.

## Tabelas novas

`separacao_ordens` (1 por pedido × centro `industria`)
- `id`, `pedido_id` (fk, unique com `centro_id`), `centro_id` (fk, CHECK centro industria via trigger), `status` text CHECK in (`aberta`, `em_separacao`, `separada`, `parcial`, `expedida`, `cancelada`), `criada_em`, `separada_em`, `separada_por` uuid fk auth.users, `expedida_em`, `expedida_por`, `motivo` (obrigatório em `parcial`/`cancelada`).

`separacao_itens`
- `id`, `ordem_id` fk, `reserva_id` fk `estoque_reservas`, `produto_id`, `endereco_id` fk `estoque_enderecos`, `quantidade` > 0, `quantidade_separada` int null, `separado_por`, `separado_em`, `falta_motivo`.
- CHECK: `quantidade_separada` entre 0 e `quantidade`; falta (`quantidade_separada < quantidade`) exige `falta_motivo`.

Os dois nascem com RLS ligado; policies: admin/operador do CD lê e escreve via RPC; seller dono da loja do pedido só lê (painel US06). Escrita direta negada.

Precisa de confirmação da dona antes de criar: o papel "operador do CD" não existe no schema. Proposta v1: `is_admin()`.

## Estados da ordem

```
aberta ──(1º item bipado)──▶ em_separacao ──(todos ok)──▶ separada ──(expedir)──▶ expedida
   │                             │
   │                             └──(falta sem reposição)──▶ parcial ──(decisão explícita)──▶ separada | cancelada
   └──(pedido cancelado)──▶ cancelada
```

## RPCs (security definer, `revoke` de anon; `authenticated` só com checagem de papel dentro)

1. `separacao_gerar(p_pedido_id)` — chamada pelo gatilho de status quando o pedido vai para `Pagamento Realizado`. Cria ordem e itens a partir das reservas `confirmada` cujo lançamento de saída tem endereço em centro `industria`. Idempotente (unique pedido × centro). Pedido sem item em custódia não gera ordem.
2. `separacao_confirmar_item(p_item_id, p_quantidade)` — operador identificado (`auth.uid()` obrigatório). Passa a ordem para `em_separacao`; quando todos os itens fecham, `separada` e o pedido vai para `Em Separação`.
3. `separacao_registrar_falta(p_item_id, p_quantidade_achada, p_motivo, p_endereco_alternativo)` — lança `transferencia` do endereço alternativo para o original (dois lançamentos, mesmo `pedido_id`) quando há saldo; sem alternativo, ajuste negativo com motivo "divergência de inventário" no endereço original e a ordem vai a `parcial`.
4. `separacao_expedir(p_ordem_id)` — exige ordem `separada`. Move o pedido para `Enviado`; quem consome a reserva é o gatilho existente (0177/0187). Pedido com ordens em mais de um centro só vai a `Enviado` quando todas estão `separada`.
5. Cancelamento: `pedido_restaurar_estoque` já devolve ao disponível; a devolução ao **endereço** passa a acontecer lançando `entrada` com o mesmo `endereco_id` da saída original e motivo "cancelamento antes da expedição". A ordem vai a `cancelada`.

Mudança em função existente: `checkout_criar_pedido` (alocação FIFO de endereço para produto em custódia) e `pedido_restaurar_estoque` (entrada no endereço). As duas estão no caminho do dinheiro: migration própria, testada em `begin … rollback`.

## Telas

- `/admin/cd/separacao` — fila de ordens `aberta`/`em_separacao`/`parcial`, ordenada por pagamento; mostra pedido, itens, código do endereço, quantidade.
- `/admin/cd/separacao/[id]` — confirmar item a item, registrar falta com sugestão de endereço alternativo (consulta `estoque_saldos_endereco`), botão expedir habilitado só em `separada`.
- Painel do seller (US06) lê `separacao_ordens` do próprio pedido, somente leitura.

Regras puras (FIFO de alocação, transição de estado da ordem) em `src/lib/logistica-parceiro/separacao.ts` com `.test.ts`.

## Testes planejados

Vitest (`src/lib/logistica-parceiro/separacao.test.ts`):
- FIFO: aloca na posição mais antiga, quebra em duas quando uma não basta, ignora bloqueada, recusa quando a soma não cobre.
- Transição: `aberta→em_separacao→separada→expedida` válida; `expedir` de `parcial` recusado; `cancelada` é terminal.

SQL em `begin … rollback` via `db query --linked`:
- Pedido pago com item em custódia gera 1 ordem; gerar de novo não duplica.
- Expedir ordem não separada: erro.
- Separação completa + expedir: pedido `Enviado`, reserva `consumida`, paridade 0, nenhum lançamento novo na expedição.
- Falta com alternativo: dois lançamentos de transferência, saldo por endereço nunca negativo.
- Cancelar pedido separado: entrada no mesmo endereço, reserva `liberada`, ordem `cancelada`.
- Concorrência: dois checkouts do último item no mesmo endereço, só um passa (lock em `estoque_saldos_endereco`).
- RLS: seller B não lê ordem do seller A; anon não executa nenhuma RPC.

## Bloqueios antes de implementar

- Não há produto em custódia: o CD tem 10 posições e saldo zero, e a 0179 impede apontar produto para ele até o M3. Sem a US03 (recebimento) não existe o que separar em produção.
- Papel do operador do CD (proposto `is_admin()` na v1).
- Premissa do PRD: pedido com item em custódia e item do estoque do seller só vai a `Enviado` quando as duas origens fecham. A ordem cobre só a custódia; o lado do seller não tem ordem.
