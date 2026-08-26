---
prd_number: "029"
status: em-progresso
priority: alta
created: 2026-08-26
issue: "#433"
depends_on: ["026"]
references:
  - "PR #416 — integração original do Turnstile (login, cadastro, checkout)"
  - "PR #422 — hotfix de CSP que destravou o Turnstile em produção"
  - "PR #439 — https://github.com/Schneider-Gr/industria24hIA/pull/439"
---

# PRD 029: Turnstile com render explícito em navegação SPA

## 1. Contexto

- **Produto/área**: `industria24.com.br`, anti-bot nos formulários de login, cadastro e
  checkout (proteção introduzida no PRD 026, US09).
- **Estado atual**: o Cloudflare Turnstile está em produção desde o PR #416 (com o hotfix de
  CSP do PR #422). O componente `TurnstileWidget` carrega o script oficial
  (`challenges.cloudflare.com/turnstile/v0/api.js`) e depende do **auto-render implícito** do
  script sobre qualquer `div.cf-turnstile` presente na página no momento do carregamento
  completo (full page load).
- **Problema**: o Next.js navega entre rotas por client-side routing (SPA) na maior parte da
  navegação do usuário — não há full page load ao ir da home para `/login`, por exemplo. Quando
  o usuário chega a `/login`, `/cadastro` ou ao checkout por navegação SPA (sem reload), a
  `div.cf-turnstile` só é criada depois que o script já rodou seu auto-render inicial, então o
  script nunca a detecta. O widget fica vazio: sem desafio anti-bot renderizado e sem o campo
  oculto `cf-turnstile-response` no formulário, o que faz a verificação server-side
  (`verificarTurnstile`, best-effort) tratar a submissão como se o Turnstile estivesse
  desligado. Na prática, a proteção anti-bot fica inativa para todo usuário que navega em vez
  de dar reload — a maioria.

> **Contexto técnico**: detalhes de `next/script`, hooks React e verificação server-side vivem
> no código (`src/components/TurnstileWidget.tsx`, `src/lib/turnstile.ts`); aqui só o suficiente
> para explicar o comportamento observável.

## 2. Solução Proposta

### Visão de produto

- O widget Turnstile passa a renderizar por conta própria a cada vez que a tela onde ele mora é
  montada, em vez de depender do auto-render do script — independente de a navegação ter sido
  full page load ou client-side.
- Do ponto de vista do usuário, nada muda quando o fluxo já funcionava (reload/entrada direta);
  a correção fecha só o caso que estava quebrado (navegação SPA).
- Nenhuma mudança de UX no desafio em si (mesmo modo Gerenciado, mesma aparência) — é
  exclusivamente confiabilidade de quando o widget aparece.

### Decisões de produto

1. **Correção cobre os 3 pontos de uso existentes (login, cadastro, checkout) via componente
   compartilhado, sem duplicar lógica por tela.** Motivo: os 3 formulários já usam o mesmo
   `TurnstileWidget`; a causa raiz é do componente, não de uma tela específica.
2. **Mantém o mesmo contrato de dados com o backend** (`cf-turnstile-response` dentro do
   `FormData` do form pai). Motivo: evita qualquer mudança em `verificarTurnstile` ou nas rotas
   que já consomem o token — o bug é só de renderização client-side.

### Fora do escopo

- Mudar o modo do widget (Gerenciado → Invisível/Não-interativo) — decisão já tomada no PRD 026,
  não revisitada aqui.
- Alterar `verificarTurnstile` ou o comportamento best-effort do backend — o backend já está
  correto; o bug é a ausência do token por falha de renderização no client.
- Novo widget/sitekey — usa o mesmo sitekey já criado e configurado na Vercel
  (`NEXT_PUBLIC_TURNSTILE_SITE_KEY`).

## 3. Funcionalidades

### US01: Widget Turnstile aparece em qualquer forma de navegação até a tela

Como usuário navegando pelo site (com ou sem reload de página), quero ver o desafio Turnstile
renderizado ao chegar em login, cadastro ou checkout, para que a submissão do formulário
carregue o token exigido pela verificação anti-bot.

**Rules:**
- O widget é renderizado (`turnstile.render`) toda vez que o componente é montado na tela,
  independente de o script já ter sido carregado por uma navegação anterior.
- O widget é desmontado corretamente (`turnstile.remove`) ao sair da tela, para não vazar
  instâncias órfãs ao navegar repetidamente entre rotas que usam o componente.
- Se `NEXT_PUBLIC_TURNSTILE_SITE_KEY` não estiver configurada, o componente não renderiza nada
  — mesmo comportamento best-effort já existente, preservado.

**Edge cases:**
- Usuário navega rapidamente para fora da tela antes do script terminar de carregar → cleanup
  não tenta remover um widget que nunca chegou a ser criado *(premissa — confirme ou corrija)*.
- Usuário navega entre duas telas que usam o widget (ex.: login → cadastro) sem reload →
  widget antigo é removido e um novo é renderizado na tela seguinte, sem resíduo do anterior.
- Script do Cloudflare falha ao carregar (bloqueio de rede, adblocker) → formulário segue
  submetendo sem o campo `cf-turnstile-response`; comportamento best-effort do backend já
  cobre esse caso hoje (não é regressão introduzida por este PRD).

## 4. Fluxo de Negócio

Não aplicável — não há ramificação de regra de negócio; é correção de um defeito de
renderização client-side que não muda decisão alguma do fluxo de login/cadastro/checkout.

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| Widget Turnstile visível em `/login`, `/cadastro` e no checkout ao chegar por navegação SPA (link interno, sem reload) | é exatamente o caso hoje quebrado — cobre a maioria real dos acessos | navegar a partir da home clicando em links internos até cada uma das 3 telas e confirmar o desafio renderizado |
| Widget Turnstile continua visível ao acessar a URL diretamente (reload/link externo) | garante que a correção não regride o caminho que já funcionava | abrir `/login`, `/cadastro` e o checkout digitando a URL direto (full page load) |
| Formulário envia `cf-turnstile-response` preenchido no `FormData` após completar o desafio, em ambos os cenários acima | é o dado que a verificação server-side depende para não tratar a submissão como não protegida | inspecionar a submissão (network tab) ou logar o valor recebido em `verificarTurnstile` durante QA |
| Nenhuma tela quebra (erro de render, exceção React) ao entrar e sair repetidamente das rotas que usam o widget | evita vazamento de instância/erro de unmount introduzido pela troca para render explícito | navegar login → cadastro → checkout → login algumas vezes seguidas e checar console sem erro |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| Submissões de login/cadastro/checkout com `cf-turnstile-response` ausente por falha de render (vs. ausente por bloqueio de rede/adblocker) | A levantar — sem instrumentação hoje que distinga as duas causas *(premissa: seria preciso logar motivo de ausência do token em `verificarTurnstile`)* | 0 por falha de render | A definir | — | Quem implementar (validação em preview cobre o release; métrica de produção fica como follow-up) |

## 6. Milestones

### Milestone 1: Widget renderiza em qualquer navegação até login, cadastro e checkout

**Por que é um marco:** fecha a lacuna real da proteção anti-bot entregue no PRD 026 — o
Turnstile estava em produção mas efetivamente inativo para a maior parte da navegação real dos
usuários (client-side routing); este marco é o anti-bot voltar a funcionar de fato, não só
existir no código.

**Funcionalidades:** US01

**Checklist de aceite:**
- [ ] Widget visível em `/login`, `/cadastro` e checkout via navegação SPA
- [ ] Widget visível nas mesmas 3 telas via reload/acesso direto (sem regressão)
- [ ] `cf-turnstile-response` chega preenchido ao backend nos dois cenários
- [ ] Sem erro de console ao navegar repetidamente entre as telas

**Aprovador:** usuário

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| Render explícito duplicado (script chama auto-render E o componente chama `render()`) causando dois widgets ou erro | Médio — quebraria a tela de login/cadastro/checkout | Script carregado com `?render=explicit`, que desativa o auto-render do Cloudflare | Mitigado |
| Regressão no caminho que já funcionava (full page load) | Alto — reintroduziria o problema que o PRD 026 resolveu | Critério de aceite cobre explicitamente os dois cenários de navegação | Pendente de QA manual |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| PRD 026 (Turnstile introduzido em produção) | Interna | Concluído | Nenhum — este PRD só existe por causa dele |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` configuradas na Vercel | Externa | Concluído (já configuradas antes deste PRD) | Nenhum — reaproveitadas, não recriadas |

## 8. Referências

- [PRD 026 — Hardening de segurança OWASP 2026-08](026-hardening-seguranca-owasp-2026-08.md) — US09, origem da integração do Turnstile
- Issue #433 — relato do widget vazio em navegação SPA
- PR #416 — integração original (login, cadastro, checkout)
- PR #422 — hotfix de CSP que destravou o Turnstile em produção
- PR #439 — https://github.com/Schneider-Gr/industria24hIA/pull/439 (esta correção)

## 9. Registro de Decisões

- **2026-08-26:** PRD aberto direto em `em-progresso`, e não `rascunho`/`pronto`, porque a
  implementação já existia (branch `fix/turnstile-spa-navigation`, commit `d9952de`) e o PR #439
  já estava aberto quando este documento foi escrito — a sessão documentou o trabalho feito, não
  planejou trabalho futuro.
- **2026-08-26:** Escopo limitado à renderização client-side; nenhuma mudança em
  `verificarTurnstile` ou no contrato do token com o backend. Motivo: a causa raiz confirmada em
  código é exclusivamente o auto-render implícito não detectar a div criada após o load inicial
  — o backend já estava correto.
