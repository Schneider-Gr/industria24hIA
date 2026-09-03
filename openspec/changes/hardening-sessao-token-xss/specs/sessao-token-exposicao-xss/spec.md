## Purpose

Registrar a postura do projeto quanto à exposição do token de sessão a XSS: o modelo
`@supabase/ssr` não permite cookie `httpOnly`, então o token é legível por JavaScript. Esta
capability define o que o sistema SHALL fazer para reduzir o impacto de um XSS, e o que fica
como risco residual aceito.

## ADDED Requirements

### Requirement: Access token tem TTL curto
O access token (JWT) emitido pelo Supabase Auth SHALL expirar em no máximo 900 segundos, de
forma que um token exfiltrado por XSS deixe de ser aceito pela API em até 15 minutos sem
depender de revogação manual.

#### Scenario: Access token roubado expira sozinho
- **WHEN** um atacante obtém o access token via XSS e o usa contra a API do Supabase
- **THEN** as chamadas passam a falhar em no máximo 15 minutos, quando o token expira

#### Scenario: Usuário legítimo não é deslogado pela expiração curta
- **WHEN** um usuário logado num painel fica inativo mais de 15 minutos e volta a navegar
- **THEN** o `proxy.ts` renova a sessão pelo refresh token de forma transparente, sem tela de login

### Requirement: Refresh token com rotação e detecção de reuso
O projeto SHALL manter habilitada a rotação de refresh token com detecção de reuso no Supabase
Auth, de forma que um refresh token exfiltrado, se usado depois que o usuário legítimo já
rotacionou, invalide a família de tokens e derrube a sessão do atacante.

#### Scenario: Refresh token reusado invalida a sessão
- **WHEN** um refresh token antigo (já rotacionado pelo usuário legítimo) é apresentado por um
  atacante
- **THEN** o Supabase detecta o reuso e revoga a família de tokens

### Requirement: Telemetria não persiste o cookie de sessão
Ferramentas de observabilidade client-side (Sentry replay) SHALL NOT capturar o header `cookie`
nem o valor dos cookies de autenticação em eventos, replays ou breadcrumbs.

#### Scenario: Replay de sessão com erro não contém o token
- **WHEN** um erro dispara um session replay para o Sentry numa rota autenticada
- **THEN** o replay enviado não contém o valor do cookie `sb-<ref>-auth-token`

## Risco residual aceito

Cookie `httpOnly` não é viável sem trocar o modelo de auth (`createBrowserClient` →
auth server-only + `proxy.ts` com todos os refreshes + reescrita do Realtime em
`ChatThread.tsx`). Com TTL curto de access token, rotação de refresh com reuse detection, CSP
com nonce nos painéis (PR #478) e ausência do token em `localStorage`, o risco residual de um
XSS resultar em account takeover persistente é considerado aceitável para o estágio atual do
produto. Revisitar se surgir requisito de compliance ou se a superfície de XSS crescer.
