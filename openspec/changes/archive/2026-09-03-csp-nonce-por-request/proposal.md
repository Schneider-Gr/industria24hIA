## Why

O PRD 027 (`docs/prds/027-csp-nonce-e-pendencias-hardening.md`) registra que o CSP introduzido no
hardening 2026-08 (PR #397) usa `'unsafe-inline'` em `script-src` por falta de infraestrutura de
nonce por request — o próprio `next.config.ts` já documentava isso como pendência
(`// ⚠️ PENDENTE: migrar para nonce por request`). `'unsafe-inline'` neutraliza boa parte da
proteção real de um CSP contra XSS: se um script malicioso for injetado por qualquer outra falha
futura, o CSP atual não bloqueia por estar inline. Agravante: o cookie de sessão do Supabase não
é `httpOnly` (modelo `@supabase/ssr`, `createBrowserClient` lê `document.cookie`), então um XSS
com `'unsafe-inline'` ativo permite roubo de token → account takeover.

## What Changes (entregue no PR #478, merge `dc863fb`, 2026-09-03)

- `src/proxy.ts` gera um nonce único por request (`crypto.randomUUID()` em base64) e emite o
  header `Content-Security-Policy` por request (o CSP saiu do `next.config.ts` estático; ficaram
  lá só os 5 headers que não variam).
- **Duas variantes de CSP, decididas por rota** (`exigeCspEstrita()` em `src/lib/gate-rotas.ts`,
  que delega a `exigeSessao()`):
  - **Rotas autenticadas** (`/admin`, `/seller`, `/afiliado`, `/parceiro`, exceto onboarding):
    `script-src 'self' 'nonce-<v>' 'strict-dynamic'`, **sem `'unsafe-inline'`**. O CSP também vai
    no request header, de onde o Next 16 extrai o nonce e o aplica a todos os `<script>` do
    framework (verificado em prod: 49/49 scripts com `nonce` no `/admin`).
  - **Rotas públicas + onboarding + `/login`**: `script-src 'self' 'unsafe-inline'` (mantido).
- `style-src 'self' 'unsafe-inline'` nas duas variantes (Next e `next/font` injetam `<style>`
  inline sem nonce; noncear estilo quebra styled-jsx e CSS inline não é vetor de exfiltração de
  token).
- `'unsafe-eval'` em `script-src` só em dev (React usa `eval` para reconstruir stack).

## Decisão de escopo (divergência do PRD 027 original — ver US01 emendada)

O PRD pedia CSP com nonce **na plataforma inteira**. Nonce força **render dinâmico em toda
página** (doc Next 16 `content-security-policy.md`: "Static optimization and ISR are disabled …
Pages cannot be cached by CDNs"), o que mataria o Static/ISR da vitrine de SEO — custo que o PRD
não previu. As rotas autenticadas já são todas `ƒ` (dynamic) porque leem `cookies()`, então
lá o custo é ~zero; e é lá que o token de sessão existe e pode ser exfiltrado. Rotas públicas não
têm sessão, então `'unsafe-inline'` nelas não expõe token — só reduz a defesa-em-profundidade
contra um XSS que já teria pouco a roubar.

## Capabilities

### New Capabilities
- `csp-nonce`: como o CSP autentica script inline por request nas rotas autenticadas,
  substituindo `'unsafe-inline'`; e por que as rotas públicas o mantêm.

## Impact

- `src/proxy.ts` (emite CSP por request, 2 variantes).
- `src/lib/gate-rotas.ts` (+`exigeCspEstrita`), `src/lib/gate-rotas.test.ts`.
- `next.config.ts` (CSP sai de `headers()`).
- PR #432 (implementação full-app anterior, com bug de nonce e sem `strict-dynamic`) foi fechado
  como superado.
- US02 do PRD 027 (pendências operacionais: signing key do webhook Uber Direct, auth da rota de
  cron de observabilidade) **não** entra nesta change — segue na Issue #423.
