## ADDED Requirements

### Requirement: Acesso negado por falta de papel é registrado em auditoria
Sempre que um gate de layout (`/admin`, `/seller`, `/parceiro`, `/afiliado`) redirecionar um
usuário **autenticado** por falta do papel exigido, um evento DEVE ser gravado em
`public.auditoria_eventos` com `acao = 'acesso.negado'`, `ator_id = auth.uid()` e `dados_depois`
contendo a rota alvo e o papel esperado. A escrita DEVE passar por RPC `security definer` (o
client não tem `insert` em `auditoria_eventos`). Falha ao registrar o evento DEVE ser capturada
no Sentry mas NÃO DEVE impedir o `redirect`. Redirecionamento por ausência de sessão (usuário
não autenticado) NÃO precisa gerar evento.

#### Scenario: Comprador autenticado é barrado em /seller
- **WHEN** uma conta autenticada sem loja é redirecionada pelo gate de `/seller`
- **THEN** um evento `acesso.negado` é gravado em `auditoria_eventos` com `ator_id` do usuário,
  rota `/seller` e papel esperado `seller`, e o redirect acontece normalmente

#### Scenario: RPC de auditoria falha
- **WHEN** a RPC `registrar_acesso_negado` retorna erro durante um gate
- **THEN** o erro é enviado ao Sentry e o usuário ainda é redirecionado para o login

#### Scenario: Visitante deslogado é barrado
- **WHEN** um usuário sem sessão é redirecionado pelo gate de `/parceiro`
- **THEN** nenhum evento `acesso.negado` é gravado (não há ator autenticado)
