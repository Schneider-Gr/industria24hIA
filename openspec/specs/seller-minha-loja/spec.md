# Seller Minha Loja Specification

## Purpose

Permite ao seller cadastrar e editar os dados da própria loja — cadastrais,
endereço, branding e chave PIX — incluindo o fluxo de abertura de loja para quem
ainda não tem uma. O item de menu "Dados" é uma âncora para esta mesma tela, não
uma página separada.

## Requirements

### Requirement: Criação de loja para usuário sem loja vinculada
O sistema SHALL permitir que um usuário autenticado sem loja crie uma, informando
ao menos o nome — a loja nasce com situação "Ativa" por padrão.

#### Scenario: Chave PIX só aceita na criação
- **WHEN** o usuário está criando a loja pela primeira vez
- **THEN** o formulário aceita chave PIX e tipo de chave PIX; nas edições
  seguintes esses dois campos deixam de ser aceitos por este formulário

#### Scenario: Branding indisponível antes de criar a loja
- **WHEN** a loja ainda não existe
- **THEN** o upload de logotipo e banner fica bloqueado até a loja ser criada

### Requirement: Edição de dados da loja restrita ao dono
O sistema SHALL permitir editar nome, contato, descrição, endereço, branding e
retirada na loja apenas para o dono autenticado da loja.

#### Scenario: Atualização sem efeito
- **WHEN** uma tentativa de atualização não afeta nenhuma linha (loja de outro
  dono ou inexistente)
- **THEN** o sistema reporta falha explícita, em vez de indicar sucesso

#### Scenario: Valor mínimo de pedido negativo
- **WHEN** o valor mínimo de pedido informado é negativo
- **THEN** a atualização é rejeitada

### Requirement: Alteração de chave PIX reinicia carência de confirmação
O sistema SHALL, ao alterar a chave PIX de uma loja já existente, validar o
formato da chave conforme o tipo declarado e reiniciar o prazo de carência antes
de a chave ficar elegível para repasse automático.

#### Scenario: Formato de chave inválido para o tipo declarado
- **WHEN** a chave informada não corresponde ao formato esperado do tipo
  declarado (CPF, CNPJ, e-mail ou telefone)
- **THEN** a alteração é rejeitada

#### Scenario: Loja de outro dono
- **WHEN** a alteração de chave PIX é solicitada para uma loja que não pertence
  ao usuário autenticado
- **THEN** a alteração é rejeitada

### Requirement: Campos restritos protegidos contra alteração fora do fluxo dedicado
O sistema SHALL impedir que o formulário geral de edição de loja altere chave
PIX, tipo de chave PIX ou situação (moderação) — essas mudanças só ocorrem por
fluxos dedicados (alteração de chave PIX, decisão de admin).

#### Scenario: Tentativa de alterar situação por não-admin
- **WHEN** um usuário que não é admin tenta alterar a situação de moderação da
  loja
- **THEN** a alteração é rejeitada, independentemente da via usada
