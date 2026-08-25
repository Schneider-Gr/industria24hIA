## Why

O PRD 027 (`docs/prds/027-csp-nonce-e-pendencias-hardening.md`) registra que o CSP introduzido no
hardening 2026-08 (PR #397) usa `'unsafe-inline'` em `script-src` e `style-src` por falta de
infraestrutura de nonce por request — o próprio `next.config.ts` já documenta isso como pendência
(`// ⚠️ PENDENTE: migrar para nonce por request`). `'unsafe-inline'` neutraliza boa parte da
proteção real de um CSP contra XSS: se um script malicioso for injetado por qualquer outra falha
futura, o CSP atual não bloqueia por estar inline.

## What Changes

- Middleware gera um nonce único por request (`crypto.randomUUID()` ou equivalente) e o propaga
  até o layout raiz.
- O header `Content-Security-Policy` passa a usar `'nonce-<valor>'` em `script-src`/`style-src`
  em vez de `'unsafe-inline'`.
- Scripts carregados via `next/script` (Sentry) e o widget `TurnstileWidget` recebem o nonce
  explicitamente.
- **BREAKING (potencial):** qualquer script/estilo inline futuro sem nonce passa a ser bloqueado
  pelo browser — precisa de checklist de PR para pegar isso antes do merge.

## Capabilities

### New Capabilities
- `csp-nonce`: como o CSP autentica script/estilo inline por request, substituindo a permissão
  ampla de `'unsafe-inline'`.

## Impact

- `next.config.ts`: geração/consumo do CSP passa a depender do nonce do request.
- `middleware.ts` (novo, ou middleware existente do projeto): gera o nonce por request.
- `src/app/layout.tsx`: propaga o nonce para os scripts/estilos que o Next.js injeta.
- `src/components/TurnstileWidget.tsx`: `next/script` recebe o nonce.
- QA manual obrigatório antes de produção — um nonce mal propagado quebra a renderização da UI
  inteira, risco maior que o problema que resolve (ver PRD 027, Riscos).
