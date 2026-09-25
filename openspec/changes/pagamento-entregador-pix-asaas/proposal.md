## Why

Levantamento em 25/09/2026: a corrida calcula `valor_parceiro` (0083), mas
nenhum código paga o entregador. `repasses.destino` só aceita `seller` ou
`afiliado` (0084) e a chave Pix do parceiro (0042) nunca é usada. Pagar o
motorista hoje é manual e fora do sistema, o que bloqueia operar a entrega por
parceiro (PRD 054) com motoristas reais.

O split do Asaas não serve: executa no recebimento, antes de existir a corrida,
e não aceita data futura (docs.asaas.com/docs/split, 25/09/2026).

## What Changes

Spec: `docs/prds/055-pagamento-do-entregador-por-pix-asaas.md`.

- Repasse com destino **entregador**, ligado à corrida, no valor do
  `valor_parceiro`, criado quando a corrida é entregue.
- Transferência **Pix pelo Asaas** (`createPixTransfer`, `POST /transfers`) para
  a chave do entregador, com a mesma trava contra Pix em dobro do repasse do
  seller (claim pendente → processando).
- Carência de 24 h depois de trocar a chave (elegibilidade própria para o
  parceiro, no modelo da 0035).
- Chave Pix obrigatória para aceitar corrida.
- Painel de ganhos do entregador e repasses de entregador na tela do admin
  (reenviar falha, estornar).

## What does NOT change

- Repasse do seller e do afiliado de vendas.
- Comissão da plataforma sobre a corrida (0083, hoje 10%).
- Split e subconta Asaas por entregador: descartados.

## Impact

- Migration: `repasses.destino` ganha `entregador`, coluna `corrida_id`,
  unicidade por corrida; RPC de elegibilidade da chave do parceiro.
- `src/lib/repasses.ts` (caminho do dinheiro): confirmação da dona antes do
  merge.
- Telas: cadastro do entregador (chave Pix), painel de ganhos, repasses do admin.
- Só move dinheiro real depois que o Asaas sair do sandbox.
