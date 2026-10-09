## ADDED Requirements

### Requirement: Lote com mínimo de reservas e prazo
O lote SHALL aceitar `minimo_reservas` (unidades) e `prazo_minimo` (data anterior à entrega).
Lote sem mínimo SHALL seguir o fluxo atual de checkout com pagamento na hora.

#### Scenario: Prazo depois da entrega
- **WHEN** o seller informa prazo do mínimo igual ou posterior à data de entrega
- **THEN** a gravação é recusada

### Requirement: Reserva sem cobrança com preço travado
Em lote com mínimo `Aberto`, a reserva SHALL ser gravada sem gerar pedido nem cobrança, com
o preço calculado no momento e travado, e SHALL baixar o saldo do lote. Os gates atuais
(CNPJ/IE, quantidade mínima do produto, saldo) SHALL valer na reserva.

#### Scenario: Reserva antes do mínimo
- **WHEN** um comprador com CNPJ reserva 10 un. num lote com 120 de 300 un. reservadas
- **THEN** a reserva fica `Reservada` com o preço do dia, o saldo cai 10 e nenhum pedido é criado

#### Scenario: Comprador sem CNPJ nem IE
- **WHEN** o comprador não tem CNPJ nem inscrição estadual no perfil
- **THEN** a reserva é recusada com a mesma mensagem do checkout

### Requirement: Cobrança quando o mínimo é atingido
Quando a soma das reservas `Reservada` atingir o mínimo, o lote SHALL virar `Garantido` e
cada reserva SHALL virar um pedido "Aguardando Pagamento" pelo preço travado, com prazo de
pagamento de 48 h. Reserva feita depois do lote `Garantido` SHALL virar pedido na hora.

#### Scenario: A reserva que completa o mínimo
- **WHEN** a reserva leva o lote de 290 para 300 un. com mínimo 300
- **THEN** o lote fica `Garantido` e todas as reservas viram pedidos com pagamento até 48 h

#### Scenario: Preço travado depois da virada do degrau
- **WHEN** a reserva foi feita a R$ 13,52 e o mínimo é atingido depois que o degrau mudou
- **THEN** o pedido sai a R$ 13,52

#### Scenario: Não pagou em 48 h
- **WHEN** o pedido passa do prazo de pagamento sem pagar
- **THEN** o pedido é cancelado, a reserva fica `Expirada` e a quantidade volta ao saldo do lote; o lote continua `Garantido`

### Requirement: Cancelamento sem cobrança no prazo
Se o prazo do mínimo vencer com o lote `Aberto`, o lote SHALL virar `Cancelado`, as reservas
SHALL virar `Cancelada`, o saldo SHALL ser devolvido e compradores e seller SHALL ser
avisados. Nenhuma cobrança SHALL existir.

#### Scenario: Prazo vence abaixo do mínimo
- **WHEN** o prazo do mínimo passa com 180 de 300 un. reservadas
- **THEN** o lote é cancelado, ninguém é cobrado e todos recebem o aviso

#### Scenario: Mínimo atingido no último dia
- **WHEN** a reserva que completa o mínimo é feita no dia do prazo
- **THEN** o lote fica `Garantido` e não é cancelado pelo processamento diário

### Requirement: Avisos do resultado do lote
O sistema SHALL avisar por WhatsApp e e-mail, pelos canais da venda futura: comprador e
seller quando o lote é garantido (comprador com o link de pagamento) e quando é cancelado.
Falha de aviso SHALL não alterar o resultado do lote.

#### Scenario: Seller sem WhatsApp
- **WHEN** o lote é garantido e o seller não tem WhatsApp cadastrado
- **THEN** o seller recebe por e-mail e o painel mostra o lote como garantido
