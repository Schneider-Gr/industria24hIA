---
prd_number: "001"
status: em-progresso
priority: alta
created: 2026-07-28
issue: "#123"
depends_on: []
references:
  - "https://github.com/Schneider-Gr/industria24hIA/pull/123"
  - "supabase/migrations/0088_bot_atendimento_leads.sql"
---

# PRD 001: Bot de Atendimento (site + WhatsApp)

## 1. Contexto

- **Produto/área**: Indústria 24h, marketplace B2B/B2C de Manaus. Área de atendimento ao cliente/comercial, cobrindo tanto compradores quanto potenciais vendedores.
- **Estado atual**: antes desta feature, dúvidas de compradores (status de pedido, funcionamento do marketplace) e interesse de novos vendedores eram tratados sem canal automatizado — dependiam de contato manual ou não eram capturados. Não havia captação estruturada de leads comerciais.
- **Problema**: usuários no site (anônimos ou logados) e contatos via WhatsApp não tinham resposta imediata a perguntas comuns nem um caminho guiado para virar lead comercial (ex.: "quero virar vendedor") *(premissa — confirme ou corrija: esse é o principal driver de negócio, não só suporte)*. Isso gera perda de conversão de leads e sobrecarga de atendimento humano para perguntas repetitivas.

> **Contexto técnico** (stack, arquitetura, padrões) vive no TRD (`docs/trd.md`), carregado automaticamente na implementação. Aqui: o bot usa LLM (gpt-4o-mini) com tools, integrado ao site via widget e ao WhatsApp via webhook Meta — ver PR #123 e migration `0088_bot_atendimento_leads.sql`.

## 2. Solução Proposta

### Visão de produto

- Um assistente conversacional único (mesmo "cérebro"/prompt) acessível por dois canais: widget de chat no site e WhatsApp.
- Responde perguntas gerais sobre o marketplace usando conteúdo curado do próprio produto (não invenção livre).
- Para usuário logado, consulta o status do próprio pedido sem expor dado financeiro.
- Capta interesse comercial ("quero vender", "quero ser afiliado" etc.) como lead estruturado, visível para o time comercial em painel dedicado.
- Permite abrir chamado de suporte quando o bot não resolve, encaminhando para o time humano via Jira. *(premissa — confirme ou corrija: "abrir_chamado" cria issue no Jira e não noutro sistema de suporte)*

### Decisões de produto

1. Identidade do contato via WhatsApp é resolvida por e-mail cadastrado (não por CPF) — decisão tomada por não haver cadastro central de CPF confiável no momento da implementação.
2. Consulta de pedido pelo bot nunca expõe dado financeiro (comissão, repasse, custo) — usa a mesma view restrita (`pedidos_cliente`) já usada no restante do produto, não uma via nova.
3. Leads captados entram com status inicial "novo" e seguem um funil de triagem manual pelo time comercial (novo → em_contato → convertido/descartado) — o bot não decide se um lead é qualificado, só captura.
4. O bot que atende no site funciona também para visitante anônimo (sem exigir login), para não perder interesse de quem ainda não tem conta. *(premissa — confirme ou corrija)*

### Fora do escopo

- Atendimento por voz/áudio (WhatsApp ou site) — só texto nesta versão. *(premissa — confirme ou corrija)*
- Transbordo automático para atendente humano em tempo real (handoff síncrono) — hoje o caminho é abrir lead/chamado, não uma fila de atendimento ao vivo.
- Publicação do número de WhatsApp para o público geral — nesta fase o número segue em processo de verificação Meta (NOT_VERIFIED) e o app ainda não foi publicado, recebendo só webhooks de teste do painel.
- Dado financeiro (valor de comissão, repasse, custo) exposto via bot, mesmo para usuário logado.
- Autenticação de identidade forte (CPF, 2FA) para vincular conversa de WhatsApp a uma conta — usa e-mail como identificador de melhor esforço.

## 3. Funcionalidades

### US01: Responder perguntas gerais sobre o marketplace pelo chat do site

Como visitante do site (anônimo ou logado), quero perguntar como o marketplace funciona, para entender a proposta sem precisar falar com um humano.

**Rules:**
- As respostas usam apenas o conteúdo curado do sistema (regras de negócio, política, FAQ do marketplace) — o bot não deve inventar informação fora desse escopo.
- Disponível tanto para visitante anônimo quanto para usuário logado, sem exigir login para essa funcionalidade.

**Edge cases:**
- Pergunta fora do escopo do conteúdo curado (ex.: assunto não relacionado ao marketplace) → bot informa que não tem essa informação e sugere abrir chamado ou reformular. *(premissa — confirme ou corrija)*
- Pergunta ambígua que poderia ser sobre pedido específico sem o usuário estar logado → bot pede login ou esclarece que não pode acessar dados de pedido sem autenticação.

### US02: Consultar status do próprio pedido pelo chat

Como comprador logado, quero perguntar ao bot sobre o status do meu pedido, para não precisar navegar no painel ou esperar atendimento humano.

**Rules:**
- A consulta só retorna pedidos do usuário autenticado na sessão atual (nunca pedido de terceiros).
- A resposta não inclui dado financeiro (comissão, valor de repasse, custo de produção) — só status/rastreio do pedido.
- A fonte de dado é a mesma view já usada no restante do produto para exibir pedidos ao cliente, garantindo paridade de regra de acesso.

**Edge cases:**
- Usuário pergunta por pedido que não é dele (tenta informar número de pedido de terceiro) → bot ignora o número informado e responde apenas com base na sessão autenticada, nunca com base em número livre digitado pelo usuário. *(premissa — confirme ou corrija: mecanismo de proteção contra tentativa de acessar pedido alheio via IDOR)*
- Usuário não tem nenhum pedido → bot informa que não encontrou pedidos associados à conta.
- Usuário não está logado e pergunta sobre pedido → bot pede para fazer login antes de responder.

### US03: Capturar lead comercial pelo chat (site ou WhatsApp)

Como visitante ou contato de WhatsApp interessado em vender no marketplace (ou outra intenção comercial), quero manifestar esse interesse pelo bot, para ser contatado pelo time comercial sem precisar preencher formulário separado.

**Rules:**
- Toda manifestação de interesse comercial identificada pelo bot gera um registro de lead com status inicial "novo".
- O lead deve registrar o canal de origem (site ou WhatsApp) e o conteúdo/contexto da manifestação de interesse. *(premissa — confirme ou corrija: quais campos exatos o lead grava, ex. nome/telefone/e-mail/mensagem)*
- Leads ficam visíveis para triagem no painel `/admin/leads`, restrito a administradores.

**Edge cases:**
- Mesmo contato manifesta interesse mais de uma vez → *(a definir: cria novo lead a cada manifestação ou atualiza o lead existente em aberto?)*
- Lead captado via WhatsApp sem e-mail identificável → registra lead com os dados disponíveis (telefone) mesmo sem conseguir resolver para uma conta existente. *(premissa — confirme ou corrija)*

### US04: Atender pelo WhatsApp com a mesma base de conhecimento do site

Como contato via WhatsApp, quero conversar com o mesmo bot de atendimento do site, para ter a mesma qualidade de resposta independente do canal que eu uso.

**Rules:**
- O webhook do WhatsApp identifica o contato por e-mail (quando possível resolver via `resolver_usuario_por_contato`) antes de liberar qualquer dado sensível (ex.: status de pedido).
- A verificação do webhook (challenge do Meta) usa um token de verificação próprio (`WHATSAPP_VERIFY_TOKEN`), diferente do App Secret da aplicação Meta.
- Mensagens trocadas (inbound e outbound) ficam registradas em `bot_conversas`/`bot_mensagens` com RLS admin-only; a escrita ocorre via service role, no mesmo padrão já usado para o webhook do Asaas.

**Edge cases:**
- Contato de WhatsApp sem e-mail resolvível para nenhuma conta → bot responde no modo "anônimo" (sem acesso a dados de pedido), mas ainda pode registrar lead.
- Token de verificação incorreto no desafio do Meta → endpoint retorna 403 e não completa a verificação (comportamento já testado em produção).
- App Meta não publicado → webhook só recebe eventos de teste disparados manualmente pelo painel Meta, não tráfego real de usuários finais até a publicação do app.

### US05: Triar leads capturados pelo bot

Como time comercial, quero ver e classificar os leads gerados pelo bot num painel dedicado, para conduzir o funil de conversão manualmente.

**Rules:**
- O painel `/admin/leads` lista leads com os status: novo, em_contato, convertido, descartado.
- Acesso restrito a administradores (mesma política de RLS admin-only das demais tabelas do bot).
- Mudança de status é uma ação manual do time comercial, não automática pelo bot.

**Edge cases:**
- Lead sem nenhuma ação de triagem por um período longo → *(a definir: existe alerta/expiração automática de lead "novo" parado? Assumindo que não nesta versão)* *(premissa — confirme ou corrija)*

## 4. Fluxo de Negócio

```
Mensagem recebida (site ou WhatsApp)
   │
   ▼
Contato identificável por e-mail?
   ├── sim ──▶ Sessão/contato vinculado a conta ──▶ Pode consultar pedido próprio
   └── não ─▶ Modo anônimo ──▶ Não pode consultar pedido, só perguntas gerais/lead

Intenção da mensagem
   ├── Pergunta geral sobre marketplace ──▶ Responde com conteúdo curado
   ├── Pergunta sobre pedido (só se identificado) ──▶ Consulta pedidos_cliente ──▶ Responde status (sem dado financeiro)
   ├── Interesse comercial (ex.: "quero vender") ──▶ Registra lead (status novo) ──▶ Aparece em /admin/leads
   └── Bot não resolve ──▶ Abre chamado no Jira ──▶ Time humano assume
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| Bot nunca retorna dado financeiro (comissão/repasse/custo) na consulta de pedido | Vazamento de margem para o comprador prejudica negociação com vendedores/afiliados | Testar pergunta de status de pedido logado e inspecionar resposta e payload da tool `buscar_pedido` |
| Consulta de pedido só retorna pedidos da sessão autenticada, nunca de número informado livremente pelo usuário | Evita IDOR — comprador vendo pedido de terceiro | Tentar consultar número de pedido de outro usuário estando logado como um terceiro |
| Endpoint de verificação do webhook WhatsApp responde 200 para token correto e 403 para token incorreto | Meta exige esse contrato para ativar o webhook; erro aqui impede recebimento de mensagens | Chamar o endpoint GET com token certo e errado e conferir status code (já testado em prod) |
| Lead capturado aparece em `/admin/leads` com status "novo" em até alguns segundos após a manifestação de interesse *(premissa — confirme o limiar aceitável)* | Time comercial precisa agir rápido em lead comercial "quente" | Manifestar interesse pelo bot e checar aparição no painel |
| Migration `0088` aplicada e verificada em produção (tabelas existem, RPC funciona) | Pré-requisito de tudo o resto — sem schema, feature não roda | `to_regclass` via `supabase db query --linked` (já executado 4/4 em 27-28/07/2026) |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| Nº de leads comerciais capturados/mês via bot | 0 (não existia captação automatizada antes) | A definir *(premissa — sem baseline histórico, marcar "A levantar")* | 30 dias após ativação plena (chave OpenAI + app Meta publicado) | — | Time comercial |
| % de conversas do bot que geram lead ou resolvem a dúvida sem escalar para humano | A levantar após 30 dias de uso real | A definir | 60 dias | — | Time comercial/produto |

## 6. Milestones

### Milestone 1: Bot responde no site com base de conhecimento própria

**Por que é um marco:** primeiro contato automatizado com o usuário funcionando de ponta a ponta no canal principal (site), sem dependência do WhatsApp/Meta.

**Funcionalidades:** US01, US02

**Checklist de aceite:**
- [ ] Bot nunca retorna dado financeiro na consulta de pedido
- [ ] Consulta de pedido só retorna pedidos da sessão autenticada

**Aprovador:** Andréia (dono do produto)

### Milestone 2: Bot captura leads comerciais

**Por que é um marco:** entrega o valor comercial central da feature — transformar interesse espontâneo em lead rastreável, com painel de triagem.

**Funcionalidades:** US03, US05

**Checklist de aceite:**
- [ ] Lead capturado aparece em `/admin/leads` com status "novo"
- [ ] Painel `/admin/leads` acessível só por administradores

**Aprovador:** Time comercial + Andréia

### Milestone 3: Bot ativo no WhatsApp em produção real

**Por que é um marco:** estende o mesmo atendimento para o canal de maior volume esperado (WhatsApp), com app Meta publicado e número verificado — hoje ainda em modo teste.

**Funcionalidades:** US04

**Checklist de aceite:**
- [ ] Endpoint de verificação do webhook responde corretamente (200/403)
- [ ] App Meta publicado (sai do modo "só recebe webhook de teste")
- [ ] Número de WhatsApp sai do status NOT_VERIFIED

**Aprovador:** Andréia

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| Bot no site fora do ar por falta de chave OpenAI válida na Vercel | Alto — feature inteira do site não funciona (`/api/bot/chat` retorna 503) | Criar `OPENAI_API_KEY` real na Vercel e redeploy | Pendente (ação humana) |
| App Secret do Meta exposto em texto puro no chat em 27/07/2026 | Alto — credencial comprometida do app WhatsApp | Rotacionar App Secret (fluxo parado no modal de senha do Meta, ação do usuário) | Pendente (ação humana) |
| App Meta não publicado / número NOT_VERIFIED | Médio — WhatsApp só funciona em modo teste, sem tráfego real | Publicar app e completar verificação do número | Pendente |
| Número de produção (`+55 11 91866-4481`, Phone Number ID `914894061706131`) pertence a uma WABA distinta ("Industria 24h", `1348786780115433`) da WABA de teste usada para configurar o webhook — sem inscrever essa WABA no app, o webhook não dispara pra ela | Alto — mensagens reais de WhatsApp não chegariam ao bot mesmo com tudo "configurado" | WABA inscrita no app via `POST /{waba-id}/subscribed_apps` em 29/07/2026 (confirmado `{"success":true}`) | Resolvido |
| Verificação do número de produção (`code_verification_status: NOT_VERIFIED`) bloqueada por throttle da Meta (`request_code` retornou erro 2388091, "aguarde 1 hour") | Alto — número fica "Offline"; não troca mensagem real até verificar | Reagendado retry automático 1h após o bloqueio (29/07/2026) | Pendente |
| Prompt do bot (systemPrompt.ts) desatualizado conforme regras de negócio evoluem | Médio — bot passa a responder errado sobre política/regra do marketplace | Revisão periódica do conteúdo curado quando regras de negócio mudarem | Monitorando |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| `OPENAI_API_KEY` válida na Vercel | Externa (ação humana/infra) | Pendente | Bloqueia Milestone 1 e 2 no canal site |
| Publicação do app Meta + verificação do número WhatsApp | Externa (processo Meta) | Pendente | Bloqueia Milestone 3 |
| WABA de produção inscrita no app (`subscribed_apps`) | Externa (Meta) | Concluída (29/07/2026) | Sem isso, webhook não valeria pro número real mesmo após verificação |
| `WHATSAPP_PHONE_ID`/`WHATSAPP_TOKEN` na Vercel ainda apontam pro número sandbox, não pro número de produção | Interna (config) | Pendente | Envio de mensagem outbound real (templates) usaria o número errado até trocar |
| View `pedidos_cliente` (já existente, migration 0027) | Interna | Concluída | Sem ela, US02 não tem fonte de dado segura |

## 8. Referências

- [PR #123 — implementação do bot de atendimento](https://github.com/Schneider-Gr/industria24hIA/pull/123) — merge da feature, resolveu conflito em `layout.tsx` com `ChatWidget` + `TabBarMobile`
- Migration `supabase/migrations/0088_bot_atendimento_leads.sql` — schema de `bot_conversas`, `bot_mensagens`, `leads` e RPC `resolver_usuario_por_contato`
- Memória de projeto `industria24h-bot-atendimento-2026-07-27` — histórico de implementação e estado de pendências

## 9. Registro de Decisões

- **2026-07-27:** identidade do contato de WhatsApp resolvida por e-mail cadastrado em `auth.users`, não por CPF. Motivo: não existe cadastro central de CPF confiável disponível no momento da implementação.
- **2026-07-27:** consulta de pedido pelo bot reaproveita a view `pedidos_cliente` (já sem campo financeiro, migration 0027) em vez de criar uma nova fonte de dado. Motivo: evitar duplicar regra de acesso e reduzir risco de vazamento por uma segunda via de exposição de dado de pedido.
- **2026-07-28:** feature tratada como um PRD único (não dividida em "bot site" e "bot WhatsApp") porque ambos os canais compartilham o mesmo prompt/tools e o mesmo modelo de captura de lead — a unidade de raciocínio de produto é "atendimento automatizado", não o canal de entrada.
- **2026-07-29:** `WHATSAPP_VERIFY_TOKEN` rotacionado na Vercel produção e webhook reconfigurado no app Meta (`industria24h-api`) com a nova URL/token; handshake testado (200 com token correto, 403 com token errado) e campo `messages` assinado.
- **2026-07-29:** descoberto que o número de produção real (`+55 11 91866-4481`) vive numa WABA separada da WABA sandbox onde o webhook foi originalmente configurado. WABA de produção inscrita no app via API (`subscribed_apps`) para herdar o mesmo webhook — decisão: reaproveitar o webhook único do app em vez de criar configuração separada por WABA, já que é o mesmo endpoint/lógica para qualquer número.
- **2026-07-29:** tentativa de verificar o número de produção (`request_code` via SMS) bloqueada pela Meta com throttle de 1h (erro 2388091) — não é falha de configuração nossa, é limite do lado da Meta. Retry agendado.
