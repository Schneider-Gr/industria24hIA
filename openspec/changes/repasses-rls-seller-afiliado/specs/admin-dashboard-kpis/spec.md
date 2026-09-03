## MODIFIED Requirements

### Requirement: KPI de repasse do seller reflete o ledger real
O dashboard do seller SHALL exibir "Repasses recebidos" como a soma de `repasses.valor` com `destino = 'seller'`, `loja_id` da loja do usuário, `status = 'transferido'` e `transferido_em` dentro da janela selecionada, com variação percentual vs. o período anterior. O detalhe do card SHALL mostrar o total ainda `pendente` (saldo corrente, sem janela).

A leitura SHALL passar pela policy RLS `repasses_seller_read` (SELECT para o dono da loja) — o valor não vem mais de `linha_itens.repasse_vendedor`.

#### Scenario: Loja com repasse transferido na janela
- **WHEN** a loja teve R$ 500,00 transferidos (`status = 'transferido'`) com `transferido_em` dentro da janela
- **THEN** o card "Repasses recebidos" mostra R$ 500,00

#### Scenario: Loja sem repasse transferido
- **WHEN** nenhum repasse da loja está `transferido` na janela
- **THEN** o card mostra R$ 0,00 e o detalhe mostra o total `pendente` da loja

#### Scenario: Isolamento entre lojas
- **WHEN** o seller A abre o dashboard
- **THEN** só os repasses das lojas de que A é `owner_id` são somados — nunca os de outra loja

### Requirement: Leitura do próprio repasse por seller e afiliado
A tabela `public.repasses` SHALL permitir SELECT para o dono da loja (`repasses.loja_id` pertence a uma `lojas` com `owner_id = auth.uid()`) e para o afiliado (`repasses.afiliado_id = auth.uid()`), sem liberar INSERT/UPDATE/DELETE. As escritas continuam restritas às funções `SECURITY DEFINER` e ao admin.

#### Scenario: Seller lê repasse da própria loja
- **WHEN** o dono de uma loja consulta `repasses` filtrando pela própria `loja_id`
- **THEN** as linhas são retornadas

#### Scenario: Seller tenta ler repasse de outra loja
- **WHEN** um seller consulta `repasses` de uma `loja_id` que não é dele
- **THEN** nenhuma linha é retornada

#### Scenario: Nenhuma escrita é liberada
- **WHEN** um seller ou afiliado tenta INSERT/UPDATE/DELETE em `repasses`
- **THEN** a operação é negada pela RLS
