# Seller Pós-venda (Disputas) Specification

## Purpose

Permite ao seller visualizar e responder disputas abertas por compradores sobre
pedidos da própria loja, e marcar a disputa como resolvida pela loja.

## Requirements

### Requirement: Acesso restrito à disputa da própria loja
O sistema SHALL restringir a visualização e resposta de uma disputa ao seller
dono da loja associada a ela.

#### Scenario: Disputa de outra loja
- **WHEN** o seller tenta acessar o detalhe de uma disputa que não pertence à sua
  loja
- **THEN** o sistema retorna "não encontrado"

### Requirement: Responder disputa pelo chat compartilhado
O sistema SHALL permitir que o seller responda a uma disputa através do mesmo
canal de chat usado na conversa comprador-vendedor.

#### Scenario: Resposta enviada pelo chat da disputa
- **WHEN** o seller envia uma mensagem na thread de uma disputa aberta da própria
  loja
- **THEN** a mensagem é registrada na mesma conversa vinculada à disputa

### Requirement: Marcar disputa como resolvida pela loja
O sistema SHALL permitir marcar uma disputa ainda não resolvida como "resolvida
pela loja", registrando o momento da resolução.

#### Scenario: Disputa já resolvida
- **WHEN** a disputa já está marcada como resolvida
- **THEN** a ação de marcar como resolvida não é exibida

### Requirement: Fotos da disputa protegidas por URL assinada
O sistema SHALL disponibilizar as fotos anexadas à disputa apenas por URL
assinada de curta duração, nunca por link público permanente.

#### Scenario: Visualização de foto anexada
- **WHEN** o seller visualiza uma foto anexada à disputa
- **THEN** o sistema gera uma URL assinada de curta duração para aquela foto, em
  vez de expor um link público permanente

### Requirement: Prazo de resposta exibido sem bloqueio automático
O sistema SHALL exibir o prazo (SLA) de resposta da loja na lista e no detalhe da
disputa.

#### Scenario: SLA vencido
- **WHEN** o prazo de resposta da loja já venceu
- **THEN** o sistema continua exibindo a data vencida, sem bloquear nenhuma ação
  adicional com base nisso *(premissa — confirme ou corrija: pode ser lacuna a
  tratar, não regra intencional)*
