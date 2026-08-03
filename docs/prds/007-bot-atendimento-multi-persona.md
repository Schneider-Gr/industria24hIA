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
  - "PRs #190, #194, #195, #196, #198, #199, #200, #201, #203 (implementação, correções pós-deploy e US05, mergeados em 2026-08-01/02)"
  - "tutorial.industria24.com.br e industria24.com.br/seller/tutoriais (fontes reais de US05)"
---

# PRD 007: Bot de atendimento multi-persona com funil no CRM

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
  um lead duplicado. **Confirmado em produção**: achado real em teste live (02/08) —
  o modelo separou e-mail e WhatsApp em 2 chamadas de `registrar_lead` na mesma
  conversa, gerando 2 leads incompletos com `etapa_funil` desatualizado.
  `registrar_lead` virou upsert por `conversa_id` (busca lead existente da conversa,
  mescla contato se for canal novo, sempre atualiza `etapa_funil`) — uma conversa tem
  no máximo 1 lead. Corrigido e retestado (PR #195).

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

### US05: Indicar o tutorial certo para dúvidas de "como fazer"

Como usuário em atendimento, quero que o bot me diga onde encontrar o tutorial (vídeo ou
site) que explica um processo, para eu ver o passo a passo real em vez de uma descrição
que pode estar errada. *(adicionada em 2026-08-02, fora do escopo original do brainstorm
— pedido do dono após o bot já estar em produção)*

**Rules:**
- Duas fontes de tutorial curadas (nenhuma inventada, confirmadas no código/skill
  `tour-e-tutoriais`): painel `industria24.com.br/seller/tutoriais` (7 assuntos — visão
  geral, cadastro de produto/venda futura/desconto progressivo, dúvidas de afiliados,
  edição de venda futura/desconto progressivo — exige login de seller) e
  `tutorial.industria24.com.br` (site externo público, fluxo do afiliado logístico em
  2 trilhas/11 passos).
- Para pergunta do tipo "como eu faço X na tela/painel", o bot prioriza citar o link do
  tutorial relevante em vez de descrever o passo a passo de memória — reduz risco de
  descrever um caminho de clique que não existe mais.
- O bot usa a URL exatamente como cadastrada, sem adicionar âncora, query ou qualquer
  sufixo — nenhuma das duas páginas tem seção endereçável por assunto individual.
- Persona sem tutorial dedicado (consumidor, afiliado de vendas) não recebe link
  inventado — o bot responde com conhecimento geral ou usa `consultar_prd` (US02).

**Edge cases:**
- Bot gera um link com fragmento inventado (ex.: `.../seller/tutoriais#como-cadastrar-produto`)
  → proibido explicitamente na instrução. **Achado real em teste live**: ocorreu em 2
  tentativas diferentes mesmo com a proibição inicial; só parou de acontecer depois de
  reescrever a URL como literal entre aspas no prompt, para o modelo copiar caractere a
  caractere em vez de compor um link novo (PRs #201 e #203).
- Usuário pede tutorial de assunto sem cobertura (ex.: consumidor perguntando "como
  funciona") → bot não simula um link; explica que não há tutorial dedicado para essa
  persona hoje.

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
| Uma conversa nunca gera mais de 1 lead, mesmo com múltiplas chamadas de `registrar_lead` na mesma conversa | Achado real em teste (02/08): duplicidade quebrava a segmentação por persona/etapa que é o objetivo da US03 | Fornecer nome+e-mail+WhatsApp juntos numa mensagem e conferir 1 único lead com `etapa_funil` final correto |
| Link de tutorial citado pelo bot nunca tem âncora/query/sufixo inventado | Achado real em teste (02/08): 2 ocorrências de URL quebrada antes da correção | Perguntar "como eu faço X" pela persona seller e conferir que o link é exatamente `https://industria24.com.br/seller/tutoriais` |

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
- [x] Bot pergunta a persona na 1ª mensagem de toda conversa nova, nos 4 canais/personas
- [x] Todo lead criado tem `persona` e `etapa_funil` preenchidos
- [x] Painel `/admin/leads` filtra por persona sem quebrar os filtros de status existentes
- [x] Uma conversa nunca gera mais de 1 lead (fix pós-deploy, PR #195)

**Aprovador:** Dono do produto (Andreia) — validado em produção real 2026-08-01/02

### Milestone 2: Bot responde com PRD real

**Por que é um marco:** o bot deixa de depender só de um resumo fixo e passa a citar a
regra de negócio atualizada — reduz risco de resposta errada por prompt desatualizado.

**Funcionalidades:** US02

**Checklist de aceite:**
- [x] Busca por PRD retorna resposta usável em até 3s
- [x] Bot responde corretamente pelo menos uma pergunta de cada persona que dependa de
  detalhe de PRD (ex.: repasse para seller, comissão para afiliado)

**Aprovador:** Dono do produto (Andreia) — validado em produção real após rotação de
credencial Atlassian (ver §9); antes da rotação a busca retornava 403 por token sem
permissão, não por limitação de plano como se supôs inicialmente

### Milestone 3: Handoff humano estruturado

**Por que é um marco:** fecha o ciclo do pré-atendimento — usuário nunca fica preso sem
saída, e todo escalonamento vira lead completo e rastreável no CRM.

**Funcionalidades:** US04

**Checklist de aceite:**
- [x] Handoff dispara exatamente após 2 tentativas sem resolver ou pedido explícito
- [ ] % de handoffs com dados de contato completos atinge o mínimo aceitável (60%) —
  volume real de produção ainda insuficiente para medir; comportamento confirmado em
  teste dirigido, métrica de 30 dias segue em aberto (§5b)

**Aprovador:** Dono do produto (Andreia) — validado em produção real 2026-08-02

### Milestone 4: Bot orienta com tutorial real

**Por que é um marco:** fecha o "ou trazer o link" do pedido do dono — quem conversa com
o bot sai sabendo exatamente onde assistir/ler o passo a passo real, em vez de depender
da memória do modelo para descrever uma tela.

**Funcionalidades:** US05

**Checklist de aceite:**
- [x] Bot cita o link correto e exato (sem fragmento inventado) pelo menos uma vez por
  persona com tutorial disponível
- [x] Persona sem tutorial não recebe link inventado

**Aprovador:** Dono do produto (Andreia) — validado em produção real 2026-08-02, após 2
rodadas de correção do mesmo achado (PRs #200, #201, #203)

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| Webhook do WhatsApp não valida assinatura Meta — expandir o escopo do bot aumenta a superfície de risco de mensagem falsa | Alto | Fechar a validação de `X-Hub-Signature-256` antes ou junto do deploy desta feature (task separada) | Pendente |
| Busca CQL no Confluence trazer conteúdo irrelevante ou estourar contexto em páginas longas | Médio | Limitar/cortar o trecho retornado; monitorar qualidade das respostas no Milestone 2 | Monitorando |
| Persona identificada errado por ambiguidade na resposta do usuário | Médio | Bot reformula e confirma antes de assumir (US01 edge case) | Mitigado |
| Token Atlassian sem permissão efetiva no Confluence/Jira (404/403 em produção) | Alto | Diagnosticado como token específico, não limitação de plano; rotacionado e validado em produção 02/08 (ver §9) | Mitigado |
| Modelo (gpt-4o-mini) inventa fragmento de URL ao citar link de tutorial mesmo com instrução explícita | Médio | 1ª tentativa de proibição não bastou; URL reforçada como literal entre aspas no prompt resolveu em 2 testes seguidos | Mitigado |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| Bot de atendimento em produção (PR #123) | Interna | Concluída | Nenhum — esta feature evolui em cima dele |
| Acesso de leitura à API do Confluence (espaço IND24H) a partir do backend do bot | Interna | Já existe — reaproveita a integração Atlassian já usada pelo `jira.ts` do bot | Nenhum |

## 8. Referências

- [Brainstorm — Bot de atendimento multi-persona](../brainstorm-bot-atendimento-multi-persona.md) — registro completo do raciocínio, pesquisa de mercado e decisões que originaram este PRD
- PR #123 (industria24hIA) — bot de atendimento em produção, base técnica desta evolução
- PR #190 — implementação inicial de US01-US04
- PR #194 — logging de erro de `abrir_chamado`/`consultar_prd` (diagnóstico)
- PR #195 — fix: `registrar_lead` vira upsert por conversa (US03 edge case)
- PR #196 — fallback de env var `ALTASSIN_JIRA` (rotação de credencial)
- PR #198, #199 — ajustes de posição/cor/ícone do widget (decisão de produto, §9)
- PR #200, #201, #203 — US05 (tutoriais) e correção de âncora inventada
- `.claude/skills/tour-e-tutoriais/SKILL.md` (industria24hIA) — fonte da curadoria de US05

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
- **2026-08-02:** Diagnóstico completo do erro 403 do Confluence e 400 do Jira em
  produção: acesso de produto, permissão de espaço e permissão de projeto já estavam
  corretos — a causa real era o token de API (`altassim_jira`) específico, não uma
  restrição do Plano Free do Confluence como se supôs num primeiro momento. Dono
  rotacionou o token pelo Atlassian; a env var recriada na Vercel ficou com nome
  diferente do original (`ALTASSIN_JIRA`, maiúsculo — nomes de env var são
  case-sensitive). Em vez de pedir nova mudança manual na Vercel, o código
  (`jira.ts`/`confluence.ts`) passou a aceitar os dois nomes como fallback. Retestado
  em produção: `consultar_prd` roda sem erro e `abrir_chamado` cria issue real no board
  KAN (ex.: KAN-105).
- **2026-08-02:** Botão do widget de chat (`ChatWidget.tsx`) ajustado por pedido
  iterativo do dono, fora do escopo original do brainstorm: posição mudou de
  `bottom-4 right-4` (colidia com o widget de terceiros "Reportar problema") para
  `bottom-20 left-4` e depois para a posição final `bottom-24 right-4` (acima do
  widget de terceiros, sem sobrepor); cor mudou de `bg-aco-600` (azul da marca) para
  `bg-yellow-400` a pedido explícito; ícone de balão de chat (SVG inline) adicionado
  ao lado do texto "Atendimento". Decisão de produto pura (aparência/posição), sem
  mudança de comportamento do bot.
- **2026-08-02:** US05 (tutoriais) adicionada fora do escopo original do brainstorm —
  pedido do dono depois do bot já em produção. Curadoria das duas fontes reais feita
  por leitura direta do código/skill do projeto, não inventada.
