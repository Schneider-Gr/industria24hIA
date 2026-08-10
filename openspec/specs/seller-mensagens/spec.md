# Seller Mensagens (Chat Comprador-Vendedor) Specification

## Purpose

Permite ao seller conversar com compradores que já concluíram uma compra na sua
loja, evitando contato direto pré-venda e mantendo negociação de preço nos
mecanismos já existentes (faixas de desconto, leilão).

## Requirements

### Requirement: Conversa só é aberta após pedido pago
O sistema SHALL liberar a abertura de uma nova conversa entre comprador e loja
apenas quando o comprador já tem um pedido pago naquela loja/produto — verificado
tanto na exibição do botão quanto, de novo, no servidor ao criar a conversa.

#### Scenario: Comprador sem pedido pago tenta iniciar conversa
- **WHEN** um comprador sem pedido pago naquela loja tenta abrir uma conversa
  diretamente (contornando a UI)
- **THEN** o sistema rejeita com "Disponível após concluir uma compra nesta
  loja.", não confiando apenas em o botão estar oculto no cliente

### Requirement: Acesso à thread restrito ao dono da loja
O sistema SHALL restringir o acesso ao detalhe de uma conversa ao usuário que é o
comprador ou o dono da loja participante, filtrando explicitamente por loja no
servidor, não só via política de acesso do banco.

#### Scenario: Seller tenta acessar conversa de outra loja
- **WHEN** um seller tenta abrir o detalhe de uma conversa vinculada a uma loja
  que não é a sua
- **THEN** o sistema retorna "não encontrado"

### Requirement: Envio de mensagem após conversa aberta
O sistema SHALL permitir o envio de mensagens em uma conversa já existente sem
reconferir o pedido pago a cada mensagem — a verificação de pedido pago acontece
apenas na abertura da conversa.

#### Scenario: Mensagem vazia ou excessivamente longa
- **WHEN** o corpo da mensagem está vazio ou excede o limite de caracteres
- **THEN** o envio é rejeitado

### Requirement: Marcação automática de leitura
O sistema SHALL marcar como lidas as mensagens do outro participante ao abrir a
conversa e a cada nova mensagem recebida em tempo real.

#### Scenario: Conversa sem nenhuma mensagem
- **WHEN** a conversa ainda não tem nenhuma mensagem
- **THEN** o sistema exibe "Nenhuma mensagem ainda. Envie a primeira pergunta."

### Requirement: Loja sem cadastro não recebe mensagens
O sistema SHALL orientar o seller sem loja cadastrada a criar a loja antes de
poder receber mensagens de compradores.

#### Scenario: Usuário sem loja acessa a inbox
- **WHEN** um usuário autenticado sem loja vinculada acessa a inbox de mensagens
- **THEN** o sistema exibe a orientação para criar a loja, em vez da lista de
  conversas
