---
prd_number: "013"
status: em-progresso
priority: crítica
created: 2026-08-11
issue: ""
depends_on: ["012"]
references:
  - "https://jam.dev/c/91830ec8-a9f2-4a11-b4ca-986fcb145a9e"
---

# PRD 013: Geração de cobrança PIX trava sem completar

## 1. Contexto

- **Produto/área**: Checkout do comprador em industria24.com.br — etapa de geração da cobrança PIX na página `/pedido/{id}` (US04 do PRD 012).
- **Estado atual**: Ver PRD 012 para o fluxo completo. Resumo do ponto relevante aqui: quando a geração automática de cobrança falha durante a confirmação do pedido, o comprador cai na página do pedido com um formulário próprio e um botão "Gerar cobrança", que deveria produzir o QR code / link PIX para pagamento.
- **Problema**: Esse botão foi testado ao vivo em produção, com conta de teste (`comprador-teste-i24`, pedido real `2642FD3F54`, R$ 10,20, 2× Tijolo cerâmico 6 furos), e **travou de forma reproduzível em 2 tentativas separadas**: a ação nunca completa, a página fica sem resposta a novas interações, e ao recarregar o pedido continua em `Aguardando Pagamento`, sem QR code gerado, com o mesmo botão "Gerar cobrança" disponível de novo — como se nada tivesse acontecido. Em uma das tentativas apareceu também uma tela de erro genérica ("Algo deu errado / Tente novamente ou volte para a página inicial") e a sessão pareceu deslogar momentaneamente. Isso bloqueia por completo o caminho de conversão via PIX, a forma de pagamento mais comum no B2B informal atendido pelo marketplace: o comprador nunca chega a ver um token para escanear.

## 2. Solução Proposta

### Visão de produto

- Garantir que o comprador sempre receba uma resposta da ação "Gerar cobrança" em tempo previsível — sucesso (QR/link) ou falha clara com opção de tentar de novo — nunca um travamento silencioso.
- Dar visibilidade de progresso durante a geração, para o comprador não pensar que o clique não funcionou.
- Impedir que cliques repetidos durante uma tentativa em andamento gerem cobranças duplicadas no Asaas.

### Decisões de produto

1. A ação deve ter um limite de tempo de resposta ao comprador — se a integração externa (Asaas) não responder dentro desse limite, o comprador vê uma falha tratada, não uma trava. *(premissa — confirme ou corrija: este PRD não fixa o valor exato do limite, isso é um critério de aceite em §5a com razão de negócio, não uma escolha técnica de implementação)*
2. Enquanto uma geração de cobrança está em andamento para um pedido, uma nova tentativa não deve poder ser iniciada em paralelo pelo mesmo comprador.

> A causa técnica provável (ausência de timeout nas chamadas HTTP ao Asaas em `src/lib/asaas.ts:18-27`, dentro da Server Action síncrona `gerarCobranca`) é um achado de investigação de código, não uma decisão de produto — a implementação da correção (timeout, retry, idempotência) é matéria de TRD/PLAN, não deste PRD. Fica registrada aqui apenas como evidência de contexto técnico que embasa a urgência e a viabilidade da correção.

### Fora do escopo

- Escolha do gateway de pagamento (permanece Asaas) — não é uma decisão deste PRD.
- Redesenho da UX de duas telas (checkout + página do pedido) para geração de cobrança — ver risco correspondente no PRD 012; aqui o objetivo é fazer a etapa existente responder de forma confiável, não redesenhar a jornada.
- Auditoria de outras falhas do gateway Asaas não relacionadas a este travamento específico (ex.: webhook, estorno) — fora do escopo deste PRD.

## 3. Funcionalidades

### US01: Receber resposta em tempo previsível ao gerar cobrança

Como comprador, quero que clicar em "Gerar cobrança" sempre resulte em uma resposta clara dentro de um tempo curto, para não ficar sem saber se a ação funcionou.

**Rules:**
- A ação deve responder (sucesso ou falha) dentro de um limite de tempo definido *(premissa — confirme ou corrija: sugiro 15s como teto observável pelo comprador, acima do qual a experiência já é percebida como travamento; valor final depende de quanto a API do Asaas normalmente demora em produção)*.
- Em caso de falha (timeout, erro do gateway, erro de rede), o comprador vê uma mensagem de erro específica, não uma tela genérica "Algo deu errado" nem uma aba sem resposta.

**Edge cases:**
- API do Asaas não responde dentro do limite → comprador vê mensagem de falha com opção de tentar novamente, pedido permanece `Aguardando Pagamento` sem cobrança gerada.
- API do Asaas responde com erro de validação (ex.: CPF inválido para o gateway) → comprador vê a mensagem de erro específica, não um travamento genérico.

### US02: Ver progresso durante a geração da cobrança

Como comprador, quero ver que o sistema está processando minha solicitação enquanto a cobrança está sendo gerada, para não pensar que o clique não teve efeito.

**Rules:**
- Ao clicar em "Gerar cobrança", a interface entra em um estado visível de "processando" até a resposta (sucesso ou falha) chegar.
- O botão fica desabilitado durante o processamento.

**Edge cases:**
- Comprador recarrega a página manualmente enquanto uma geração está em andamento → *(premissa — confirme ou corrija: comportamento esperado é a página refletir o estado real do pedido ao recarregar — se a cobrança já foi gerada no backend nesse meio-tempo, mostrar o QR; se não, mostrar o formulário novamente, nunca um estado "travado")*.

### US03: Impedir geração duplicada de cobrança por cliques repetidos

Como comprador, quero que cliques repetidos no botão durante uma tentativa em andamento não gerem múltiplas cobranças para o mesmo pedido, para não receber QR codes conflitantes.

**Rules:**
- Enquanto uma tentativa de geração está em andamento para um pedido, uma nova tentativa para o mesmo pedido é bloqueada ou tratada como idempotente (retorna a mesma cobrança em andamento/gerada, não cria uma segunda).
- Não existe hoje rate limit nessa ação (diferente da criação do pedido, que tem `checarLimite`) — este comportamento cobre esse gap.

**Edge cases:**
- Duas abas abertas no mesmo pedido, ambas clicando "Gerar cobrança" quase simultaneamente → apenas uma cobrança é criada no Asaas; a segunda tentativa recebe a cobrança já existente, não uma duplicata.

## 4. Fluxo de Negócio

```
Comprador clica "Gerar cobrança"
   │
   ▼
Já existe geração em andamento para este pedido?
   ├── sim ──▶ Bloqueia nova tentativa / retorna estado da tentativa em curso
   └── não ──▶ Inicia geração (mostra estado "processando")
                  │
                  ▼
            Resposta do gateway dentro do limite de tempo?
                  ├── sim, sucesso ──▶ Mostra QR/link PIX
                  ├── sim, erro ──▶ Mostra mensagem de erro específica + permite tentar de novo
                  └── não (timeout) ──▶ Mostra falha tratada + permite tentar de novo
                                          (nunca trava a página sem resposta)
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| Clique em "Gerar cobrança" sempre resulta em resposta visível (sucesso ou erro) em até 15s *(premissa — valor a confirmar)* | Acima disso o comprador percebe como travamento e abandona a compra — sintoma observado nos 2 testes ao vivo | Simular lentidão/indisponibilidade do Asaas (mock ou ambiente de teste) e cronometrar o tempo até a UI mostrar erro |
| Nenhum estado "sem resposta" (aba trava, sem erro nem sucesso) é atingível pelo fluxo | É exatamente o bug reproduzido em produção; qualquer resíduo desse comportamento mantém o caminho PIX quebrado | Repetir o cenário de falha do gateway N vezes e confirmar que a UI sempre resolve para sucesso ou erro, nunca fica pendurada |
| Cliques repetidos durante uma geração em andamento não criam mais de uma cobrança Asaas para o mesmo pedido | Evita QR codes conflitantes e cobranças fantasma que confundem o comprador e complicam reconciliação financeira | Clicar múltiplas vezes rapidamente em ambiente de teste e conferir no Asaas (ou na tabela `pedidos`) que só existe uma cobrança associada |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| Taxa de sucesso do clique "Gerar cobrança" (resulta em QR/link exibido) | A levantar — hoje 0% observado em 2/2 tentativas ao vivo, mas amostra pequena; medir via logs de produção antes de fixar baseline | ≥ 95% *(premissa — meta ideal é próxima de 100%, ajustar conforme taxa real de indisponibilidade do Asaas)* | A definir | 90% | Time de produto/checkout |
| Tempo entre clique e resposta (sucesso ou erro) | A levantar | p95 < 15s *(premissa)* | A definir | 30s | Time de produto/checkout |

## 6. Milestones

### Milestone 1: Eliminar o travamento sem resposta

**Por que é um marco:** É o requisito mínimo para o comprador conseguir pagar via PIX de novo — sem isso, o caminho principal de conversão do marketplace está efetivamente fora do ar para essa forma de pagamento, que é a mais usada no B2B informal atendido.

**Funcionalidades:** US01, US02

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [x] Reprodução original (conta de teste `comprador-teste-i24`, pedido real `2642FD3F54`) executada de novo em produção em 2026-08-11 após o deploy do PR #271 — completou com **falha tratada visível**: `?erro=O Pix não está disponível no momento. Para utilizá-lo, sua conta precisa estar aprovada.` Não gerou QR (ver nota abaixo), mas não travou.
- [x] Nenhuma tentativa de teste resultou em página sem resposta — clique respondeu imediatamente com a mensagem de erro, sem timeout de CDP nem tela genérica "Algo deu errado"

**Aprovador:** Dono do produto / squad de checkout

> **Achado da verificação em produção (2026-08-11):** a mensagem de erro tratada revela que a causa do "Pix não disponível" agora é a **conta Asaas não estar aprovada para operar PIX**, não o travamento original. Isso é uma pendência de configuração/negócio no Asaas (fora do escopo desta correção de código), não um bug — mas impede fechar o Milestone 1 como "QR exibido com sucesso" até a conta ser aprovada. O objetivo deste PRD (eliminar o travamento sem resposta) está confirmado; o pagamento PIX em si continua bloqueado por outro motivo, a ser tratado como item separado (verificar aprovação da conta Asaas em produção).

### Milestone 2: Prevenir cobranças duplicadas

**Por que é um marco:** Fecha o gap de idempotência que fica mais exposto uma vez que o comprador ganha capacidade de tentar novamente (Milestone 1) — sem isso, a correção do travamento poderia introduzir um novo risco de duplicidade.

**Funcionalidades:** US03

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Teste de cliques repetidos confirma cobrança única por pedido

**Aprovador:** Dono do produto / squad de checkout

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| Causa raiz pode não ser (só) ausência de timeout — pode haver rate limiting do Asaas ou chave de API mal configurada em produção | Alto — corrigir só o timeout pode não resolver o sintoma | Validar em produção com rede instrumentada (HAR/network log) antes de considerar a correção completa; conferir `ASASS_API_KEY`/`ASAAS_ENV` em produção | **Confirmado em parte (2026-08-11):** chave está configurada (a chamada chega ao Asaas e retorna erro de negócio, não erro de auth/rede). Causa real do "Pix indisponível" é a conta Asaas não estar aprovada para operar PIX — item novo, não coberto por este PRD |
| Bug pode já ter sido notado/reportado por compradores reais sem chegar à equipe (abandono silencioso) | Alto — perda de conversão não rastreada | Levantar métricas de pedidos presos em `Aguardando Pagamento` sem `asaas_cobranca_id` há mais de X horas | Pendente |
| Sessão do comprador pareceu deslogar durante uma das tentativas de reprodução | Médio — pode ser um problema relacionado ou só efeito colateral da aba travada | Investigar separadamente se persistir após a correção do travamento principal | Pendente |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| PRD 012 (fluxo de checkout PIX as-is) | Interna | Rascunho | Este PRD assume o desenho de duas telas documentado ali; se aquele fluxo mudar, este precisa ser revisitado |
| Configuração de produção do Asaas (`ASASS_API_KEY`, `ASAAS_ENV`) | Externa | A confirmar | Se a chave estiver ausente/errada em produção, a correção de timeout sozinha não resolve o sintoma |

## 8. Referências

- [Gravação Jam do checkout PIX do Mercado Livre](https://jam.dev/c/91830ec8-a9f2-4a11-b4ca-986fcb145a9e) — benchmark: no ML, a etapa de pagamento nunca trava sem resposta; o comprador sempre é levado a uma tela de finalização (`/checkout/finisher`) ou erro claro.
- Memória do projeto `industria24h-asaas-producao-config-bloqueada-2026-08-06` — incidente anterior de env var do Asaas trocada em produção (já resolvido); vale reconferir se não regrediu antes de descartar como causa deste bug.

## 9. Registro de Decisões

- **2026-08-11:** Bug tratado como PRD próprio (crítico) em vez de edge case do PRD 012. Motivo: tem impacto direto e mensurável em conversão (bloqueia 100% dos pagamentos PIX na etapa manual), causa técnica já localizada em código, e merece rastreamento de ciclo de vida próprio (rascunho → pronto → em-progresso → concluído) independente da documentação do fluxo geral.
- **2026-08-11:** Correção técnica (timeout, AbortController, idempotência) não detalhada aqui — fica para TRD/PLAN. Motivo: este documento fixa o comportamento esperado do ponto de vista do comprador (resposta em tempo previsível, sem duplicidade), não a implementação.

## 10. Implementação (2026-08-11)

⚠ A primeira tentativa de implementação foi feita em cima de uma cópia local desatualizada de `web/` (branch `feat/loja-seletor-menu`, dezenas de commits atrás de `master` — sem os módulos de disputas, termos de perecíveis, repasse PIX, etc.). Foi revertida sem commit antes de causar regressão. A implementação real abaixo foi refeita em worktree limpo a partir de `origin/master` (`C:\tmp\w-fix-checkout-pix-timeout`, branch `fix/checkout-pix-timeout-travando`), contra o código de produção de verdade.

- `src/lib/asaas.ts`: `asaas<T>()` agora usa `AbortController` com timeout de 12s em todo `fetch` ao Asaas. Timeout vira `Error` tratado ("Tempo esgotado ao comunicar com o Asaas."), consumido pelos catches em `finalizarCompra` (best-effort, loga e segue) e `gerarCobranca`. Isso resolve diretamente a causa reproduzida: a Server Action deixa de ficar pendurada sem resposta.
- `src/app/checkout/actions.ts`: `gerarCobranca` **não tinha try/catch em `master`** — erro/timeout do Asaas subia cru pro `global-error` do Next (bate com a tela genérica "Algo deu errado" vista numa das reproduções ao vivo). Agora captura e redireciona com `?erro=`, mesmo padrão de `finalizarCompra`. Também ganhou `checarLimite('gerar-cobranca:{pedidoId}', 1, 15_000)` no início, bloqueando uma segunda tentativa para o mesmo pedido dentro da janela (US03).
- `src/app/pedido/[id]/page.tsx` + `gerar-cobranca-botao.tsx` (novo): `searchParams` passou a aceitar `erro`, mensagem de erro exibida acima do form, botão vira client component com `useFormStatus` (desabilita e mostra "Gerando cobrança..." durante o submit) — US02.
- Typecheck (`tsc --noEmit`) e lint limpos contra o código real de `master`. Commit `e3e8a59` no branch `fix/checkout-pix-timeout-travando` (não pushado — aguardando revisão do usuário antes de abrir PR).

**Pendente para fechar o PRD (marcar `concluido`):** abrir PR e mergear; reproduzir o cenário original ao vivo em produção (conta de teste, pedido real) confirmando que "Gerar cobrança" agora sempre resolve para QR ou erro tratado, nunca trava — item 5.3 do checklist. Timeout de 12s é um valor de partida (premissa), não validado contra latência real do Asaas em produção.
