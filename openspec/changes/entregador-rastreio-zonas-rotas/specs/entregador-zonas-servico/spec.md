# Zonas de serviço do entregador

## ADDED Requirements

### Requirement: Entregador declara onde atende

O sistema SHALL permitir que o entregador cadastre sua zona de serviço como uma
lista de bairros e/ou prefixos de CEP de 5 dígitos.

#### Scenario: Cadastro por bairro

- **WHEN** o entregador seleciona bairros de Manaus na configuração logística
- **THEN** os bairros ficam gravados como sua zona de serviço

#### Scenario: Cadastro por prefixo de CEP

- **WHEN** o entregador informa um prefixo de CEP com 5 dígitos
- **THEN** o prefixo é aceito; prefixo com outro tamanho ou com letras é
  recusado

#### Scenario: Entregador edita a zona de outro

- **WHEN** um usuário tenta alterar a zona de outro entregador
- **THEN** a alteração é recusada

### Requirement: Despacho respeita a zona de serviço

O sistema SHALL oferecer a corrida despachada somente a entregadores cuja zona
inclua o destino, preservando quem ainda não cadastrou zona.

#### Scenario: Destino dentro da zona

- **WHEN** um pedido pago gera corrida e o CEP ou o bairro de destino está na
  zona do afiliado logístico aprovado da loja
- **THEN** o afiliado recebe a exclusividade como hoje

#### Scenario: Destino fora da zona

- **WHEN** o destino não está na zona do afiliado
- **THEN** ele não recebe a exclusividade, e o despacho segue para o próximo
  elegível ou para o pool aberto

#### Scenario: Entregador sem zona cadastrada

- **WHEN** o afiliado não cadastrou nenhuma zona
- **THEN** ele continua elegível como hoje, e a tela dele pede o cadastro da
  zona

#### Scenario: Ninguém atende o destino

- **WHEN** nenhum entregador aprovado atende o destino
- **THEN** a corrida vai para o pool aberto, sem bloquear o pedido

### Requirement: Checkout não oferece entregador local fora da zona

O sistema SHALL ocultar a opção de entrega por parceiro local no checkout
quando nenhum entregador elegível atende o CEP de destino.

#### Scenario: Destino sem cobertura

- **WHEN** o comprador informa um CEP que nenhum entregador da loja atende
- **THEN** a opção de parceiro local não aparece e o frete padrão continua
  disponível
