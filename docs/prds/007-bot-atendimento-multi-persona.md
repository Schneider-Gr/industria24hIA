---
prd_number: "007"
status: rascunho
priority: alta
created: 2026-08-01
issue: ""
depends_on: []
references:
  - "docs/brainstorm-bot-atendimento-multi-persona.md"
  - "PR #123 (bot de atendimento em produção — base desta evolução)"
  - "Confluence espaço IND24H (16 PRDs do marketplace, fonte de conhecimento consultada por US02)"
---

# PRD 001: Bot de atendimento multi-persona com funil no CRM

## 1. Contexto

- **Produto/área**: Atendimento e CRM do marketplace industria24.com.br.
- **Estado atual**: já existe um bot de atendimento em produção (site + WhatsApp), com
  tabelas de conversa/lead no Supabase, conteúdo de conhecimento curado manualmente num
  system prompt único, e captura de lead genérica (sem diferenciar quem está falando).
  O bot não distingue consumidor, seller, motorista ou afiliado — trata todo mundo com
  o mesmo roteiro — e não há critério explícito de quando oferecer contato humano.
- **Problema**: consumidor, seller, motorista e afiliado têm dúvidas e jornadas
  completamente diferentes no marketplace (rastrear pedido vs. entender repasse vs.
  aceitar corrida vs. calcular comissão). Um atendimento genérico responde mal a
  perguntas específicas de persona, não alimenta o CRM com dado de funil segmentado, e
  hoje só escala para humano por decisão implícita do modelo, sem critério.

> **Contexto técnico**: tabelas `bot_conversas`/`bot_mensagens`/`leads` (Supabase),
> `src/lib/ai/systemPrompt.ts`, `/api/bot/chat` e `/api/bot/whatsapp/webhook` já
> existem e são o ponto de partida desta feature. Detalhe de implementação vive no TRD.

## 2. Solução Proposta

### Visão de produto

- O bot identifica logo no início de que persona se trata (consumidor, seller,
  motorista ou afiliado) e passa a conduzir a conversa com o roteiro certo para ela.
- Quando a dúvida exige detalhe específico de regra de negócio, o bot busca a resposta
  no PRD real do marketplace em vez de depender só de um resumo fixo no prompt.
- Cada conversa avança por um funil (identificação → atendimento → resolução ou
  escalonamento), e o estágio fica registrado no CRM junto com a persona.
- Só depois de esgotar as tentativas de resolver sozinho, ou se o usuário pedir, o bot
  oferece contato humano e coleta nome, e-mail e WhatsApp.

### Decisões de produto

1. Persona é perguntada explicitamente no início da conversa, não inferida — evita erro
   de roteamento por ambiguidade. *(decisão já validada com o usuário no brainstorm)*
2. Consulta a PRD é feita sob demanda (busca por palavra-chave), não por um pipeline de
   busca semântica com pré-indexação — o volume de PRDs (16) não justifica a
   complexidade e o custo por chamada de uma base vetorial pré-indexada.
   *(decisão já validada com o usuário no brainstorm)*
3. Handoff humano dispara em duas condições: 2 tentativas do bot sem resolver a dúvida
   OU pedido explícito do usuário a qualquer momento. *(decisão já validada com o
   usuário no brainstorm)*
4. O funil fica na tabela `leads` já existente, com dois campos novos (`persona` e
   `etapa_funil`), em vez de uma estrutura de pipeline nova. *(decisão já validada com
   o usuário no brainstorm)*

> Decisão técnica de qual mecanismo de busca chamar contra o Confluence (endpoint,
> autenticação, biblioteca) não entra aqui — é constraint de implementação, vai no TRD.

### Fora do escopo

- Trocar a base do bot por uma plataforma de mercado (Chatwoot, Intercom Fin, Kapso
  como CRM) — avaliado no brainstorm e descartado: nenhuma resolve a lógica de domínio
  do marketplace, que já existe e funciona.
- Pipeline de busca semântica com embeddings/vector DB sobre os PRDs — desproporcional
  para 16 documentos; pode ser revisitado se o volume de PRDs crescer muito.
- Fechar a validação de assinatura (`X-Hub-Signature-256`) do webhook do WhatsApp —
  pendência de segurança pré-existente e independente desta feature. *(risco registrado
  em §7, mas o fix em si é outro PRD/task)*
- Pipeline Kanban visual novo para o funil — usa o painel `/admin/leads` existente,
  sem tela nova.
- Confirmar/adotar o Kapso MCP como canal — fica fora até ser verificado o que ele
  oferece de fato.

## 3. Funcionalidades

### US01: Identificar a persona no início do atendimento

Como usuário do marketplace (consumidor, seller, motorista ou afiliado), quero que o
bot pergunte quem eu sou logo no início da conversa, para que ele me atenda com o
roteiro certo em vez de respostas genéricas.

**Rules:**
- A primeira interação do bot em toda conversa nova pergunta explicitamente a persona,
  com as 4 opções (consumidor, seller, motorista, afiliado).
- A persona escolhida fica associada à conversa (`bot_conversas`) e é usada para
  selecionar o system prompt especializado dali em diante.
- Se o usuário está logado e tem papel conhecido no sistema (ex.: conta de seller),
  o bot pode sugerir a persona como padrão, mas ainda confirma antes de assumir.
  *(premissa — confirme ou corrija: o brainstorm decidiu pergunta explícita "no
  início"; aqui assumo que pré-preencher a partir do login é aceitável desde que
  ainda peça confirmação, não pule a pergunta)*

**Edge cases:**
- Usuário responde algo fora das 4 opções → bot repete a pergunta reformulada, sem
  travar a conversa.
- Usuário muda de assunto no meio da conversa e a persona já identificada não bate mais
  com a nova pergunta (ex.: consumidor pergunta sobre repasse de seller) → bot avisa que
  vai trocar de contexto e confirma a nova persona antes de responder.
  *(premissa — confirme ou corrija)*

### US02: Responder dúvidas com base no PRD real do marketplace

Como usuário em atendimento, quero que o bot responda dúvidas específicas de regra de
negócio com base no conteúdo real e atualizado do PRD, para não receber informação
desatualizada ou genérica.

**Rules:**
- Para perguntas que exigem detalhe de regra de negócio (não cobertas pelo núcleo comum
  de conhecimento do bot), o bot busca por palavra-chave nas páginas do espaço
  Confluence do marketplace e usa o conteúdo relevante para compor a resposta.
- A busca é feita sob demanda, por conversa, não pré-carregada ou indexada.
- Se a busca não retornar nenhuma página relevante, o bot trata como tentativa não
  resolvida (conta para o critério de handoff da US04).

**Edge cases:**
- Busca retorna uma página muito longa → bot usa apenas a seção/trecho relevante à
  pergunta, não o documento inteiro. *(premissa — confirme ou corrija: o "como" de
  cortar o trecho é decisão técnica, mas o comportamento esperado — não estourar
  contexto nem devolver a página toda ao usuário — é regra de produto)*
- API do Confluence indisponível ou lenta → bot informa que não conseguiu consultar a
  base de conhecimento agora e segue com o conhecimento geral do prompt, sem travar a
  conversa. *(premissa — confirme ou corrija)*

### US03: Registrar persona e estágio do funil no CRM

Como time comercial/CS, quero que cada lead capturado pelo bot registre a persona e o
estágio do funil em que a conversa parou, para segmentar e priorizar o atendimento no
CRM.

**Rules:**
- A tabela `leads` ganha os campos `persona` (consumidor | seller | motorista |
  afiliado) e `etapa_funil`.
- `etapa_funil` avança conforme a conversa progride: `persona_identificada` →
  `em_atendimento` → `resolvido_pelo_bot` (fim, sem handoff) ou `escalado_humano`
  (quando a US04 dispara) → `convertido` | `descartado` (atualização manual no painel,
  como já ocorre hoje com o status). *(premissa — confirme ou corrija: valores exatos
  do funil não foram fechados no brainstorm, ficou como ponto em aberto; esta é uma
  proposta razoável a partir do fluxo descrito)*
- O painel `/admin/leads` passa a permitir filtrar por `persona` e exibir `etapa_funil`,
  sem quebrar os filtros de status já existentes.

**Edge cases:**
- Conversa não chega a identificar persona (usuário abandona antes de responder) →
  lead não é criado, ou é criado com `persona` nula e `etapa_funil = abandonado`, sem
  aparecer nos funis segmentados. *(premissa — confirme ou corrija)*
- Lead já existente (mesmo contato) retorna numa nova conversa com persona diferente da
  registrada anteriormente → atualiza a persona no registro existente em vez de criar
  um lead duplicado. *(premissa — confirme ou corrija)*

### US04: Oferecer contato humano com critério explícito

Como usuário que não teve a dúvida resolvida pelo bot, quero poder falar com um humano
de forma clara, para não ficar preso num atendimento automático que não me ajuda.

**Rules:**
- O bot oferece contato humano quando: (a) já tentou responder a mesma dúvida 2 vezes
  sem sucesso, ou (b) o usuário pede explicitamente a qualquer momento da conversa.
- Ao oferecer/aceitar o contato humano, o bot coleta nome, e-mail e telefone/WhatsApp
  antes de encerrar, e esses dados são persistidos no lead (via `registrar_lead`) com
  `etapa_funil = escalado_humano`.
- Se o usuário já está logado, o bot pode pré-preencher nome/e-mail a partir da conta e
  só confirma, sem pedir de novo. *(premissa — confirme ou corrija)*

**Edge cases:**
- Usuário pede contato humano mas não fornece um dos três dados (ex.: recusa dar
  WhatsApp) → bot registra o lead com os dados disponíveis, sem bloquear o
  encaminhamento por campo faltante. *(premissa — confirme ou corrija)*
- Usuário pede contato humano na primeira mensagem, antes de qualquer tentativa de
  resolução → bot atende o pedido imediatamente (a regra de 2 tentativas é um teto, não
  um mínimo obrigatório antes de aceitar o pedido explícito).

## 4. Fluxo de Negócio

```
Nova conversa
   │
   ▼
Bot pergunta a persona
   │
   ▼
Persona identificada? ──não──▶ Repete pergunta (US01)
   │ sim
   ▼
Usuário faz pergunta ──▶ Bot tenta responder
   │                        (conhecimento geral ou busca PRD sob demanda — US02)
   ▼
Resolveu? ──sim──▶ etapa_funil = resolvido_pelo_bot ──▶ Fim
   │ não
   ▼
Pedido explícito de humano OU 2ª tentativa sem sucesso?
   ├── não ──▶ Bot tenta de novo (volta para "Usuário faz pergunta")
   └── sim ──▶ Coleta nome/e-mail/WhatsApp (US04)
                  │
                  ▼
              etapa_funil = escalado_humano ──▶ Lead registrado no CRM (US03)
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| Bot pergunta a persona na 1ª mensagem de toda conversa nova, nos 4 canais/personas | Sem isso, US01 não existe — é o gatilho de todo o roteamento | Iniciar conversa nova no site e no WhatsApp, checar que a 1ª resposta do bot pergunta a persona |
| Busca por PRD retorna resposta usável em até 3s | Acima disso o chat perde fluidez, ao contrário do padrão atual (resposta imediata) *(premissa — confirme ou corrija: limiar não foi discutido no brainstorm, valor de referência inferido)* | Medir tempo de resposta em perguntas que exigem busca no Confluence |
| Handoff dispara exatamente após 2 tentativas sem resolver ou pedido explícito, nunca antes nem depois | É o critério central decidido no brainstorm — se não for exato, o comportamento fica ambíguo de novo | Simular conversa com 2 respostas insatisfatórias seguidas e conferir que o bot oferece humano na 2ª, não na 1ª nem na 3ª |
| Todo lead criado por handoff tem `persona` e `etapa_funil` preenchidos | Sem isso o CRM não segmenta por persona, que é o objetivo desta feature | Consultar `leads` após um handoff de teste e conferir os campos |
| Painel `/admin/leads` filtra por persona sem quebrar os filtros de status existentes | Regressão no painel já em uso pelo time comercial seria inaceitável | Testar filtro combinado persona + status no painel |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| % de conversas com persona identificada corretamente | A levantar — bot atual não segmenta por persona, não há baseline | 90% | 30 dias após deploy | 75% | Time de produto/CS |
| % de handoffs com dados de contato completos (nome+e-mail+whats) | A levantar | 80% | 30 dias após deploy | 60% | Time de produto/CS |

## 6. Milestones

### Milestone 1: Bot identifica quem fala e registra no funil

**Por que é um marco:** hoje o bot trata todo mundo igual; a partir daqui toda conversa
sabe de que persona se trata e isso já fica visível no CRM — é a base que as outras
melhorias dependem.

**Funcionalidades:** US01, US03

**Checklist de aceite:**
- [ ] Bot pergunta a persona na 1ª mensagem de toda conversa nova, nos 4 canais/personas
- [ ] Todo lead criado tem `persona` e `etapa_funil` preenchidos
- [ ] Painel `/admin/leads` filtra por persona sem quebrar os filtros de status existentes

**Aprovador:** Dono do produto (Andreia)

### Milestone 2: Bot responde com PRD real

**Por que é um marco:** o bot deixa de depender só de um resumo fixo e passa a citar a
regra de negócio atualizada — reduz risco de resposta errada por prompt desatualizado.

**Funcionalidades:** US02

**Checklist de aceite:**
- [ ] Busca por PRD retorna resposta usável em até 3s
- [ ] Bot responde corretamente pelo menos uma pergunta de cada persona que dependa de
  detalhe de PRD (ex.: repasse para seller, comissão para afiliado)

**Aprovador:** Dono do produto (Andreia)

### Milestone 3: Handoff humano estruturado

**Por que é um marco:** fecha o ciclo do pré-atendimento — usuário nunca fica preso sem
saída, e todo escalonamento vira lead completo e rastreável no CRM.

**Funcionalidades:** US04

**Checklist de aceite:**
- [ ] Handoff dispara exatamente após 2 tentativas sem resolver ou pedido explícito
- [ ] % de handoffs com dados de contato completos atinge o mínimo aceitável (60%)

**Aprovador:** Dono do produto (Andreia)

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| Webhook do WhatsApp não valida assinatura Meta — expandir o escopo do bot aumenta a superfície de risco de mensagem falsa | Alto | Fechar a validação de `X-Hub-Signature-256` antes ou junto do deploy desta feature (task separada) | Pendente |
| Busca CQL no Confluence trazer conteúdo irrelevante ou estourar contexto em páginas longas | Médio | Limitar/cortar o trecho retornado; monitorar qualidade das respostas no Milestone 2 | Pendente |
| Persona identificada errado por ambiguidade na resposta do usuário | Médio | Bot reformula e confirma antes de assumir (US01 edge case) | Pendente |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| Bot de atendimento em produção (PR #123) | Interna | Concluída | Nenhum — esta feature evolui em cima dele |
| Acesso de leitura à API do Confluence (espaço IND24H) a partir do backend do bot | Interna | Já existe — reaproveita a integração Atlassian já usada pelo `jira.ts` do bot | Nenhum |

## 8. Referências

- [Brainstorm — Bot de atendimento multi-persona](../brainstorm-bot-atendimento-multi-persona.md) — registro completo do raciocínio, pesquisa de mercado e decisões que originaram este PRD
- PR #123 (industria24hIA) — bot de atendimento em produção, base técnica desta evolução

## 9. Registro de Decisões

- **2026-08-01:** Evoluir o bot já em produção em vez de trocar por plataforma de
  mercado (Chatwoot/Intercom Fin/Kapso). Motivo: nenhuma resolve a lógica de domínio do
  marketplace, que já existe e funciona; trocar jogaria fora integração validada.
- **2026-08-01:** Consulta a PRD via busca por palavra-chave sob demanda, não RAG
  vetorial. Motivo: 16 páginas no espaço Confluence não justificam pipeline de
  embeddings/vector DB (custo e latência desproporcionais ao volume).
- **2026-08-01:** Persona identificada por pergunta explícita no início da conversa, não
  por inferência automática. Motivo: simplicidade e previsibilidade, evita erro de
  roteamento por ambiguidade.
- **2026-08-01:** Handoff humano após 2 tentativas sem resolver OU pedido explícito.
  Motivo: equilibra a intenção original ("só depois da jornada") com não frustrar quem
  não sabe que pode pedir humano a qualquer momento.
- **2026-08-01:** Funil registrado como extensão da tabela `leads` existente
  (`persona` + `etapa_funil`), não como estrutura de pipeline nova. Motivo: reaproveita
  schema, painel admin e relatórios de funil já existentes no CRM.
- **2026-08-01:** Valores de `etapa_funil` de US03 aprovados como propostos. Acesso à
  API do Confluence confirmado como já existente (reaproveita a integração Atlassian
  usada por `jira.ts`), removendo a dependência pendente do Milestone 2. Fix de
  segurança do webhook do WhatsApp (`X-Hub-Signature-256`) confirmado como risco
  monitorado separado, não bloqueante desta implementação.
