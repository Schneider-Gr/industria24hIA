## Purpose

Definir como o CSP autentica script inline por request via nonce nas rotas autenticadas,
substituindo `'unsafe-inline'` — e por que as rotas públicas o mantêm.

## ADDED Requirements

### Requirement: Rotas autenticadas rejeitam script inline sem nonce válido do request
Para todo request a uma rota gated por sessão (`/admin`, `/seller`, `/afiliado`, `/parceiro`,
exceto as rotas de onboarding prerenderizadas), o sistema SHALL gerar um nonce criptograficamente
aleatório, emitir o header `Content-Security-Policy` com `script-src 'self' 'nonce-<valor>'
'strict-dynamic'` (sem `'unsafe-inline'`), e emitir esse mesmo CSP no request header para que o
Next.js extraia o nonce e o aplique a toda tag `<script>` do framework.

#### Scenario: Painel renderiza com todos os scripts noncedos
- **WHEN** um usuário logado abre `/admin` ou `/seller`
- **THEN** o header CSP da resposta contém `script-src 'self' 'nonce-<v>' 'strict-dynamic'` sem
  `'unsafe-inline'`, e todas as tags `<script>` da página carregam o atributo `nonce` com esse valor

#### Scenario: Script inline injetado sem nonce é bloqueado
- **WHEN** um XSS numa rota autenticada tenta executar `<script>` inline sem o nonce do request
- **THEN** o navegador bloqueia a execução (comportamento esperado do CSP)

#### Scenario: Nonce distinto por request
- **WHEN** dois requests chegam à mesma rota autenticada
- **THEN** cada um recebe um nonce gerado independentemente

### Requirement: Rotas públicas mantêm 'unsafe-inline' para preservar Static/ISR
Para rotas não gated por sessão (vitrine, produto, loja, categoria, carrinho, checkout, login,
onboarding), o sistema SHALL emitir `script-src 'self' 'unsafe-inline'`. Nonce forçaria render
dinâmico em toda página (limitação do Next.js), desabilitando Static/ISR e cache de CDN da
vitrine de SEO; essas rotas não têm sessão nem token, então `'unsafe-inline'` nelas não expõe
credencial.

#### Scenario: Página de produto continua servida de cache
- **WHEN** um visitante anônimo abre uma página de produto
- **THEN** a resposta pode vir de cache de CDN (`X-Vercel-Cache: HIT`/`PRERENDER`) e o header CSP
  usa `'unsafe-inline'` em `script-src`

#### Scenario: Rota de onboarding sob prefixo de painel usa a variante pública
- **WHEN** um visitante anônimo abre `/seller/cadastro` (prerenderizado estático)
- **THEN** o CSP usa `'unsafe-inline'` — a variante com nonce quebraria os `<script>` da página
  estática, que não têm o atributo `nonce`

### Requirement: style-src mantém 'unsafe-inline' nas duas variantes
O sistema SHALL manter `style-src 'self' 'unsafe-inline'` em todas as rotas. Next.js e
`next/font` injetam `<style>` inline sem nonce; noncear estilo quebra a renderização e CSS inline
não é vetor de exfiltração de token de sessão.
