## Purpose

Garantir que ações do seller sobre `solicitacoes_credito` verifiquem posse no código da
aplicação, não só na RLS, seguindo o mesmo padrão de defesa em profundidade já usado em
`moderarAfiliacao`.

## ADDED Requirements

### Requirement: Cancelamento de crédito exige posse verificada no código
O sistema SHALL cancelar uma solicitação de crédito somente quando ela pertencer à loja do
usuário autenticado que faz a requisição, verificando essa condição explicitamente na query de
atualização (não apenas confiando na policy de RLS).

#### Scenario: Seller cancela solicitação da própria loja
- **WHEN** um seller autenticado cancela uma solicitação de crédito que pertence à sua loja
- **THEN** o status muda para `Cancelada`

#### Scenario: Seller tenta cancelar solicitação de outra loja
- **WHEN** um seller autenticado tenta cancelar uma solicitação de crédito que pertence à loja de
  outro seller
- **THEN** nenhuma linha é alterada e a ação retorna um erro identificável (não um sucesso
  silencioso)
