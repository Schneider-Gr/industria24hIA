## Why

Auditoria de segurança (sessão 31/08/2026, item 7 do checklist). O cookie de sessão do
Supabase **não é `httpOnly`**, e isso é inerente ao modelo `@supabase/ssr` adotado no projeto:
`createBrowserClient` (`src/lib/supabase/client.ts`, usado em `FormularioLogin.tsx`,
`ChatThread.tsx`, `ImageUpload.tsx` e outros client components) lê e renova a sessão a partir de
`document.cookie`. Nem `src/lib/supabase/server.ts` nem `src/proxy.ts` passam `httpOnly` nas
opções de cookie — e não podem, sem quebrar o client do browser.

Estado atual verificado:

- O token **não** está em `localStorage` (bom — `createBrowserClient` usa cookie, não o
  `localStorage` do `supabase-js` legado).
- Cookies `sb-<ref>-auth-token` (chunked `.0`/`.1`, contendo access + refresh JWT):
  `SameSite=Lax`, `Secure` em produção, **sem `HttpOnly`**.
- Access token TTL = 3600s (default do Supabase).
- Payload do JWT é base64url legível — isso é by-design em qualquer JWT e não é vulnerabilidade;
  não há segredo no payload e a assinatura (HS256 pelo JWT secret do projeto) impede forja.

**Risco:** qualquer XSS na aplicação permite ler `document.cookie` e exfiltrar access + refresh
token → account takeover, válido até o refresh token ser revogado.

A camada CSP dessa mitigação está sendo tratada no PR #478 (nonce por request nos painéis,
remove `'unsafe-inline'` de `script-src`). Este change cobre as mitigações de **sessão**.

## What Changes

Mitigações proporcionais, sem rearquitetura de autenticação:

- Reduzir o **JWT expiry** (access token TTL) no painel Supabase de 3600s para **900s** — encolhe
  a janela em que um access token roubado é utilizável (o refresh continua sendo o alvo maior,
  mas exige o fluxo de rotação, que tem reuse detection).
- Confirmar e documentar que **refresh token rotation + reuse detection** está habilitado
  (Auth → Sessions no painel Supabase).
- Confirmar que o **Sentry session replay** não captura o cookie de sessão (o replay do projeto
  já roda com PII off / `maskAllText` — verificar que cookies também não vazam).

## Non-goals

- **Cookie `httpOnly` de verdade.** Exigiria abandonar `createBrowserClient`, mover 100% da
  autenticação para o servidor, fazer o `proxy.ts` renovar toda sessão com `httpOnly: true`, e
  reescrever `ChatThread.tsx` (que usa `session.access_token` para autenticar o Realtime do
  Supabase). É uma mudança de arquitetura grande e desproporcional ao risco residual depois das
  mitigações acima somadas ao PR #478. Fica registrada aqui como opção avaliada e adiada.

## Capabilities

### New Capabilities
- `sessao-token-exposicao-xss`: postura do projeto quanto à exposição do token de sessão a XSS —
  o que está mitigado, o que é aceito como risco residual e por quê.

## Impact

- Nenhuma mudança de código. Configuração no painel Supabase (JWT expiry, verificação de rotação
  de refresh token) + documentação da decisão.
- Cross-ref: PR #478 (`feat/csp-nonce-rotas-autenticadas`) cobre a camada CSP.
- Issue de rastreamento: #487.
