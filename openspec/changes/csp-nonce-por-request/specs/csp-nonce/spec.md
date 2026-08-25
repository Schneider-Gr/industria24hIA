## Purpose

Definir como o CSP autentica script/estilo inline por request via nonce, substituindo
`'unsafe-inline'` — a última lacuna conhecida do CSP introduzido no hardening 2026-08 (PR #397).

## ADDED Requirements

### Requirement: CSP rejeita script/estilo inline sem nonce válido do request
O sistema SHALL gerar um nonce criptograficamente aleatório por request e incluí-lo tanto no
header `Content-Security-Policy` (`'nonce-<valor>'` em `script-src` e `style-src`) quanto em toda
tag `<script>`/`<style>` inline renderizada nesse mesmo request. O sistema SHALL NOT usar
`'unsafe-inline'` em `script-src` ou `style-src` depois desta mudança.

#### Scenario: Página renderiza normalmente com nonce correto
- **WHEN** um request chega e o middleware gera um nonce
- **THEN** o header CSP da resposta contém esse nonce e todo script/estilo inline da página
  carrega o mesmo valor no atributo `nonce`

#### Scenario: Script inline sem nonce (regressão futura)
- **WHEN** um componente novo renderiza `<script>` inline sem o atributo `nonce`
- **THEN** o navegador bloqueia a execução desse script (comportamento esperado do CSP, não bug)

#### Scenario: Nonce não pode ser reutilizado entre requests
- **WHEN** dois requests diferentes chegam ao mesmo tempo
- **THEN** cada um recebe um nonce distinto, gerado independentemente
