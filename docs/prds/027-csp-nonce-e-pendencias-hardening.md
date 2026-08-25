---
prd_number: "027"
status: pronto
priority: média
created: 2026-08-25
issue: "#423"
depends_on: ["026"]
references:
  - "openspec/changes/csp-nonce-por-request/" # spec derivada deste PRD
---

# PRD 027: CSP com nonce por request e pendências operacionais do hardening

## 1. Contexto

- **Produto/área**: plataforma inteira (`industria24.com.br`), camada de headers HTTP e
  configuração de infraestrutura (Vercel).
- **Estado atual**: o PRD 026 fechou os achados de segurança de código do hardening OWASP
  2026-08. Duas categorias de trabalho ficaram deliberadamente fora daquele escopo: (a) o CSP
  atual usa `'unsafe-inline'` em `script-src`/`style-src` porque não há infraestrutura de nonce
  por request; (b) duas ações puramente operacionais (não código) seguem pendentes de quem tem
  acesso aos painéis externos.
- **Problema**: `'unsafe-inline'` neutraliza boa parte da proteção que um CSP oferece contra XSS
  — se um script malicioso for injetado via alguma falha futura, o CSP atual não o bloqueia por
  estar inline. As pendências operacionais (b) bloqueiam funcionalidade real em produção
  (webhook Uber Direct fora do ar) e um dashboard interno (histórico de cron).

## 2. Solução Proposta

### Visão de produto

- Gerar um nonce único por request no servidor (middleware ou layout raiz) e propagá-lo tanto
  para o header CSP quanto para toda tag `<script>`/`<style>` inline que o Next.js e os
  componentes do app emitem, permitindo remover `'unsafe-inline'`.
- Nada muda do ponto de vista do usuário final — é reforço de proteção invisível.
- As pendências operacionais não são "feature" no sentido de comportamento novo — são checklist
  de conclusão do hardening já entregue, registradas aqui para não se perderem.

### Decisões de produto

1. **Nonce por request via middleware, não build-time.** Motivo: CSP com nonce estático no build
   seria reutilizável entre requests, perdendo a proteção real do nonce.

### Fora do escopo

- Migrar `dangerouslySetInnerHTML` ou scripts de terceiro que não sejam Next.js/Sentry/Turnstile
  para o modelo de nonce — nenhum caso conhecido hoje além desses três.
- Rate limit distribuído via Upstash — adiado por decisão já registrada no PRD 026 até haver
  abuso real medido.
- Criptografia de coluna (pgcrypto) — mantido como está, decisão já registrada no PRD 026.

## 3. Funcionalidades

### US01: CSP sem 'unsafe-inline'

Como plataforma, quero que o CSP rejeite qualquer script/estilo inline sem o nonce do request
atual, para que um XSS eventual não consiga executar script injetado mesmo que outra camada de
defesa falhe.

**Rules:**
- Nonce gerado por request (`crypto.randomUUID()` ou equivalente) no middleware, propagado via
  header customizado ou context até o layout raiz.
- `script-src`/`style-src` do CSP passam a usar `'nonce-<valor>'` em vez de `'unsafe-inline'`.
- Scripts já carregados via `next/script` (Sentry) e via `TurnstileWidget` recebem o nonce
  explicitamente.

**Edge cases:**
- Middleware falha em gerar o nonce (erro inesperado) → fail-closed não é opção aqui (quebraria
  o site inteiro); logar no Sentry e servir sem nonce só nesse request específico
  *(premissa — confirme ou corrija: pode ser preferível um retry interno em vez de degradar)*.
- Componente novo que usa `dangerouslySetInnerHTML` sem nonce → CSP bloqueia silenciosamente;
  precisa de um lint/checklist de PR para pegar isso antes do merge *(premissa)*.

### US02: Fechar as duas pendências operacionais do hardening

Como plataforma, quero que as duas ações que dependem de acesso a painel externo sejam
concluídas, para que o hardening de segurança de 2026-08 seja considerado 100% fechado.

**Rules:**
- `UBER_DIRECT_WEBHOOK_SIGNING_KEY` regravada no Vercel (Production + Preview) com o valor real
  copiado do painel Uber Direct — reativa o webhook, hoje fail-closed 100% do tempo (PR #396).
- `CRON_SECRET` confirmada também no projeto Vercel do `dashboard-ops` — sem isso, o painel de
  observabilidade de cron fica sem dado (PR #397).

**Edge cases:**
- Signing key copiada errada de novo (mesmo erro de 2026-08-03) → validar com uma chamada de
  teste do painel Uber Direct antes de considerar concluído, não só "gravou e seguiu".

## 4. Fluxo de Negócio

Não aplicável — sem ramificação de regra de negócio relevante; é puramente reforço técnico e
checklist operacional.

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| CSP sem `'unsafe-inline'` em `script-src` e `style-src` | reduz a superfície real de um XSS bem-sucedido | inspecionar o header `Content-Security-Policy` em produção |
| App carrega e funciona normalmente após a mudança (nenhuma tela quebrada por CSP) | um nonce mal propagado quebra a UI inteira, pior que o problema que resolve | QA manual navegando pelas áreas principais (vitrine, seller, admin, checkout) em preview |
| Webhook Uber Direct volta a processar atualização de status real | funcionalidade de logística real hoje fora do ar | confirmar no painel Uber Direct que um evento real chegou e atualizou `rotas.status` |
| Dashboard de cron do `dashboard-ops` volta a mostrar dados | painel interno hoje quebrado (502) | abrir o dashboard e confirmar histórico de execução visível |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| Diretivas CSP com `'unsafe-inline'` | 2 (`script-src`, `style-src`) | 0 | A definir | — | Quem implementar o nonce |
| Pendências operacionais em aberto do hardening 2026-08 | 2 | 0 | A definir | — | Usuário (acesso aos painéis) |

## 6. Milestones

### Milestone 1: Nonce por request no CSP

**Por que é um marco:** fecha a última lacuna conhecida do CSP introduzido no hardening
2026-08 — sai de "boa cobertura de origem" para "proteção real contra inline injection".

**Funcionalidades:** US01

**Checklist de aceite:**
- [ ] CSP sem `'unsafe-inline'` em produção
- [ ] QA manual sem regressão visual/funcional

**Aprovador:** usuário

### Milestone 2: Fechar pendências operacionais

**Por que é um marco:** o hardening 2026-08 só está 100% concluído quando as duas
funcionalidades que ele quebrou/exigiu (webhook Uber Direct, dashboard de cron) voltam a
funcionar de ponta a ponta, não só no código.

**Funcionalidades:** US02

**Checklist de aceite:**
- [ ] Webhook Uber Direct processando eventos reais
- [ ] Dashboard `dashboard-ops` exibindo histórico de cron

**Aprovador:** usuário

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| Nonce mal propagado quebra renderização de página inteira | Alto | Rollout primeiro em preview, QA manual completo antes de produção | Pendente |
| Signing key do Uber Direct copiada errada de novo | Médio — repete o incidente de 2026-08-03 | Validar com chamada de teste antes de fechar a pendência | Pendente |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| PRD 026 (hardening concluído) | Interna | Concluído | Nenhum — este PRD só existe por causa dele |
| Acesso ao painel Uber Direct | Externa | Depende do usuário | Bloqueia Milestone 2 (Uber Direct) |
| Acesso ao projeto Vercel do `dashboard-ops` | Externa | Depende do usuário | Bloqueia Milestone 2 (dashboard de cron) |

## 8. Referências

- [PRD 026 — Hardening de segurança OWASP 2026-08](026-hardening-seguranca-owasp-2026-08.md) — origem das duas pendências e da decisão de adiar o nonce
- Issue #396 (webhook Uber Direct) e o comentário no código de `next.config.ts` (`// ⚠️ PENDENTE: migrar para nonce por request`)

## 9. Registro de Decisões

- **2026-08-25:** PRD aberto (`pronto`) em vez de já entrar em `em-progresso`, porque nenhum dos
  dois milestones foi iniciado ainda — a sessão que o criou só documentou o trabalho restante a
  pedido do usuário, não começou a implementação.
