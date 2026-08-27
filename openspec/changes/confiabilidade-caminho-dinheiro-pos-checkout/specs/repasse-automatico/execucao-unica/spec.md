## Purpose

Garante que o repasse automático via PIX (ao seller na confirmação de entrega, ao afiliado no mesmo gatilho) transfira cada valor no máximo uma vez, mesmo quando o recálculo de repasse é reexecutado (webhook + verificação manual, ou o endpoint público do entregador chamado mais de uma vez) ou roda concorrentemente.

## ADDED Requirements

### Requirement: Unicidade da linha de repasse por seller
O sistema SHALL garantir que exista no máximo uma linha em `repasses` com `destino = 'seller'` por pedido, de forma que o recálculo de repasse (`repasses_recalcular_pedido`) atualize a linha existente em vez de inserir uma nova.

#### Scenario: Segunda execução do recálculo para o mesmo pedido
- **WHEN** `repasses_recalcular_pedido` roda pela segunda vez para um pedido que já tem uma linha `repasses` de seller
- **THEN** a linha existente é atualizada (valor recalculado) se ainda estiver `pendente`, e nenhuma segunda linha de seller é criada

#### Scenario: Recálculo após a linha já ter sido transferida
- **WHEN** `repasses_recalcular_pedido` roda para um pedido cuja linha de seller já está `transferido`
- **THEN** a linha não é alterada e nenhuma nova linha `pendente` de seller é criada

### Requirement: Reivindicação atômica antes da transferência
O sistema SHALL marcar a linha de repasse como `processando` numa operação atômica condicionada a `status = 'pendente'` antes de chamar a API de transferência PIX, e SHALL só executar a transferência se essa marcação tiver efetivamente mudado a linha.

#### Scenario: Duas execuções concorrentes do disparo de repasse
- **WHEN** duas chamadas de `dispararRepasseAutomaticoComCliente` para o mesmo pedido tentam transferir a mesma linha `pendente` ao mesmo tempo
- **THEN** apenas uma consegue marcar a linha como `processando` e chama `createPixTransfer`; a outra recebe zero linhas na marcação e não chama a API

#### Scenario: Falha de rede entre a transferência e a gravação do resultado
- **WHEN** `createPixTransfer` tem sucesso mas o processo cai antes de gravar `status = 'transferido'`
- **THEN** a linha permanece em `processando` (não volta para `pendente`), e uma reexecução do disparo não seleciona linhas `processando` para transferir de novo

#### Scenario: Erro retornado pela API de transferência
- **WHEN** `createPixTransfer` lança erro para uma linha já marcada `processando`
- **THEN** a linha vai para `status = 'falhou'` e o erro é registrado no Sentry, mantendo o comportamento atual de tratamento de falha

### Requirement: Tratamento de repasse preso em processando
O sistema SHALL expor, no painel `/admin/repasses`, as linhas em `status = 'processando'` como um estado distinto de `pendente` e `falhou`, e SHALL permitir que o admin decida entre reprocessar (após confirmar na Asaas que a transferência não saiu) ou marcar como `transferido` (se saiu).

#### Scenario: Admin revisa um repasse preso
- **WHEN** uma linha ficou em `processando` por mais tempo que o razoável para uma transferência
- **THEN** ela aparece no painel sinalizada como pendente de decisão humana, com o `externalReference` (id da linha) visível para conferência na Asaas

## MODIFIED behavior notes

- O `check` de `repasses.status` passa a aceitar `processando` além de `pendente`, `transferido`, `falhou`, `inelegivel`, `estornado`.
- O bloco de `destino = 'seller'` em `repasses_recalcular_pedido` passa a mirar o índice parcial `unique (pedido_id, destino) where afiliado_id is null` no `on conflict`; o bloco de `destino = 'afiliado'` continua mirando `unique (pedido_id, destino, afiliado_id)` (afiliado_id não nulo, constraint já funciona).
