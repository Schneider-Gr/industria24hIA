---
prd_number: "021"
status: em-progresso
priority: média
created: 2026-07-28
issue: ""
depends_on: ["020"]
references:
  - "docs/prds/020-bot-atendimento.md"
  - "https://github.com/Schneider-Gr/industria24hIA/issues/141 — spec original desta feature"
  - "https://github.com/Schneider-Gr/industria24hIA/pull/302 — implementação em produção: kanban, dedupe, scoring por IA, follow-up WhatsApp/e-mail"
  - "https://github.com/Schneider-Gr/industria24hIA/issues/308 / PR #310 — histórico logado, contato auto-preenchido, transcrição no card"
  - "supabase/migrations/0127_crm_leads_pipeline.sql, 0128_lead_followups_email.sql"
---

# PRD 021: CRM — Gestão do Funil de Leads

> Renumerado de `docs/prd/web-002-crm-funil-leads.md` em 19/08/2026 (consolidação da numeração de PRDs em `docs/prds/`). Conteúdo inalterado, só a numeração e os links internos.

## 1. Contexto

- **Produto/área**: Indústria 24h, marketplace de Manaus. Área comercial/atendimento — evolução direta do módulo de captura de leads entregue no PRD 020 (bot de atendimento).
- **Estado atual (atualizado 19/08/2026 — feature majoritariamente implementada e em produção via PR #302 e PR #310):** o painel `/admin/leads` evoluiu de lista plana para kanban por status (novo/em_contato/convertido/descartado), com histórico de interação manual, dono/responsável, score e resumo automático por IA, dedupe por contato, follow-up multicanal (WhatsApp com opt-in obrigatório, e-mail) e transcrição real da conversa do bot no card. As USs abaixo foram reescritas para refletir o que existe — as premissas originais que o próprio desenvolvimento resolveu estão marcadas como tal.
- **Problema original**: sem histórico e sem dono, um lead podia ser contatado por duas pessoas do time comercial ao mesmo tempo, ou esquecido sem que ninguém percebesse. Isso derrubava a taxa de conversão de leads que o PRD 020 se propôs a aumentar — captar o lead sem um funil de acompanhamento estruturado captura o dado, mas não fecha a venda.

> **Contexto técnico** (stack, arquitetura, padrões) vive no TRD (`docs/trd.md`), carregado automaticamente na implementação. Aqui: a feature estende a tabela `leads` e o painel `/admin/leads` já existentes (migration `0088`, PR #123), com migrations aditivas `0127`/`0128` (fonte/score/resumo_ia/scored_at/whatsapp_optin, `lead_followups`) — não cria um novo sistema de CRM do zero.

## 2. Solução Proposta

### Visão de produto

- Cada lead ganha uma linha do tempo de interações (nota, ligação, mensagem enviada) registrada pelo time comercial, não só um status isolado.
- Todo lead tem um responsável (dono) — **resolvido: atribuição é manual pelo admin** (não há rodízio automático); seller enxerga automaticamente os leads vinculados à própria loja (`loja_id`) sem atribuição manual.
- Painel `/admin/leads` é um **kanban** por status (novo/em_contato/convertido/descartado, cada card mostra score, resumo, fonte), não uma tabela — decisão tomada na implementação por espelhar a "saúde do funil de relance" (US visual, não estava especificada como kanban originalmente).
- **(implementado)** Cada lead ganha um **score** (quente/morno/frio) e um **resumo** gerados por IA (mesmo modelo do bot, gpt-4o-mini), throttlado (só repontua depois de 1h) para não gerar custo por mensagem.
- **(implementado)** Registro manual de lead (Instagram, telefone, presencial) com **dedupe** — contato já existente (telefone normalizado ou e-mail) bloqueia a duplicata em vez de criar um segundo card.
- **(implementado)** Follow-up multicanal: WhatsApp exige opt-in explícito registrado antes de habilitar o envio (política Meta); e-mail via Resend, habilitado depois que o domínio foi validado (era "integração pendente" na primeira versão do PR #302, ativado em 18/08/2026).
- **(implementado, spec #308)** Card do lead mostra a transcrição real da conversa do bot (`bot_mensagens`), não só notas manuais.
- Lead que fica "novo" ou "em_contato" sem nenhuma interação por um período configurável aparece destacado como atrasado no painel *(ainda não implementado — ver Fora do escopo desta rodada)*.

### Decisões de produto

1. O funil de status permanece o mesmo do PRD 020 (novo, em_contato, convertido, descartado) — confirmado na implementação, não foi reformulado.
2. Registrar uma interação (nota, ligação etc.) não muda o status automaticamente — mudança de status continua sendo uma ação manual e explícita do time comercial, para evitar status incorreto por engano.
3. **(spec #141)** Dono do seller: em vez de rodízio ou atribuição automática por carga, a visibilidade do seller é automática via `loja_id` do lead (quando o lead está vinculado a uma loja) — a atribuição manual (`responsavel_id`) continua exclusiva de admin↔admin. Decisão adotada como default enquanto a issue #125 do mapa de CRM (critério de "dono do seller") segue aberta.
4. **(spec #141)** Fonte do lead nasce com 3 valores (`bot_site`, `whatsapp`, `manual`) — carrinho abandonado como fonte fica para quando a issue #127 do mapa fechar; o campo é extensível por migration aditiva.

### Fora do escopo

- Automação de follow-up (disparo automático de mensagem/e-mail para o lead sem ação humana) — follow-up é sempre disparado por um humano a partir do card, nunca autônomo.
- Alerta/expiração de lead "atrasado" sem interação — não implementado nesta rodada (ver US03 original, ainda como premissa em aberto).
- Pipeline de vendas com valor monetário associado ao lead (ex.: ticket estimado, forecast de receita) — não há dado de valor/negociação nesta versão.
- Relacionamento com clientes já convertidos em compradores recorrentes (CRM de pós-venda) — isso é outra feature, fora deste PRD.
- Rodízio automático ou distribuição por território/carga de trabalho — atribuição de responsável continua manual (admin) ou automática só via vínculo de loja (seller).
- Integração com CRM externo (Salesforce, HubSpot etc.) — o funil vive só dentro do painel do próprio industria24h.
- Envio automático de mensagem WhatsApp para leads sem opt-in — bloqueado por política Meta, opt-in é sempre um passo manual e explícito.

## 3. Funcionalidades

### US01: Registrar histórico de interação com um lead

Como pessoa do time comercial, quero registrar uma nota ou interação (ligação, mensagem enviada, reunião) num lead, para que qualquer pessoa da equipe veja o que já foi feito sem depender da minha memória.

**Rules:**
- Toda interação registrada guarda quem registrou e quando, além do conteúdo da nota.
- O histórico de um lead é ordenado cronologicamente, do mais recente para o mais antigo.
- Registrar uma interação não altera o status do lead automaticamente.

**Edge cases:**
- Duas pessoas registram interação no mesmo lead quase ao mesmo tempo → ambas as interações são salvas, nenhuma sobrescreve a outra. *(premissa — confirme ou corrija: histórico é append-only, não há edição/exclusão de nota de terceiro)*
- Nota vazia ou só espaços → bloqueada, não salva registro sem conteúdo.

### US02: Atribuir responsável por um lead

Como pessoa do time comercial, quero que cada lead tenha um responsável definido, para que fique claro quem deve agir e evitar que dois vendedores contatem a mesma pessoa.

**Rules:**
- Um lead tem no máximo um responsável ativo por vez.
- **Resolvido na implementação:** reatribuição manual é exclusiva de admin (não do próprio responsável atual) — decisão simplificada por não haver ainda um critério de "dono do seller" fechado (issue #125 do mapa de CRM).
- O painel `/admin/leads` permite filtrar leads por responsável.
- **(spec #141)** Seller vê automaticamente os leads vinculados à própria loja (`loja_id`), sem precisar de atribuição manual — RLS-scoped, seller nunca vê lead de loja alheia. Lead sem loja (ex.: vindo do bot geral) segue admin-only até atribuição manual.

**Edge cases:**
- Lead novo sem responsável atribuído → aparece destacado como "sem dono" no painel, para não passar despercebido. *(confirmado na implementação)*
- Responsável atribuído é removido/desativado do sistema → lead permanece com o histórico intacto, mas fica sinalizado para reatribuição. *(premissa — confirme ou corrija: cenário raro, comportamento exato pode ser definido na implementação)*

### US03: Ver leads atrasados no funil

Como pessoa do time comercial, quero identificar rapidamente quais leads estão parados há muito tempo sem interação, para agir antes de perder a oportunidade.

**Rules:**
- Um lead é considerado "atrasado" quando está em status "novo" ou "em_contato" e não recebe nenhuma interação registrada por mais que um prazo definido (ex.: 3 dias úteis). *(premissa — confirme ou corrija o prazo exato)*
- Leads atrasados aparecem destacados visualmente no painel `/admin/leads` e podem ser filtrados isoladamente.
- Leads em status "convertido" ou "descartado" nunca contam como atrasados, independente do tempo parado.

**Edge cases:**
- Lead atrasado recebe uma interação registrada → deixa de ser considerado atrasado imediatamente, mesmo que o status não mude.
- Lead criado fora do horário comercial (fim de semana, feriado) → o prazo de atraso considera dias corridos ou só dias úteis *(a definir — impacta diretamente o cálculo, não dá para assumir com segurança)*.

### US04: Registrar contato manual sem duplicar lead *(spec #141, implementado)*

Como pessoa do time comercial, quero registrar um contato feito fora do bot (Instagram, telefone, presencial), para que esses leads entrem no mesmo funil.

**Rules:**
- Antes de criar, o sistema verifica se já existe lead com o mesmo contato (telefone normalizado — só dígitos — ou e-mail exato).
- Se encontrar duplicata, bloqueia a criação com uma mensagem apontando o lead existente, em vez de criar um segundo card.
- Lead manual nasce com fonte `manual` e etapa `persona_identificada`.

**Edge cases:**
- Contato com formatação diferente do já cadastrado (ex.: `(92) 98888-7777` vs `5592988887777`) → dedupe reconhece como o mesmo (compara só dígitos).
- Erro de validação/duplicidade → aparece inline no formulário (não derruba a página numa tela de erro genérica — achado de QA, corrigido via `useActionState`).

### US05: Pontuar e resumir lead automaticamente por IA *(spec #141, implementado)*

Como pessoa do time comercial, quero ver um score (quente/morno/frio) e um resumo da conversa no card do lead, para priorizar quem contatar primeiro sem ler a conversa inteira.

**Rules:**
- Scoring usa o mesmo modelo do bot de atendimento (gpt-4o-mini), disparado quando o bot registra/atualiza o lead durante a conversa — nunca por mensagem individual.
- Throttle: só repontua se a última pontuação tem mais de 1h ou nunca aconteceu — protege contra custo de IA proporcional ao volume de mensagens.
- Falha de scoring nunca derruba o atendimento (best-effort).

**Edge cases:**
- Lead sem `conversa_id` (registrado manualmente) → nunca é pontuado, campo score/resumo fica vazio no card.
- Resposta da IA fora do formato esperado (score inválido, JSON malformado) → pontuação é descartada silenciosamente, sem gravar dado inconsistente.

### US06: Disparar follow-up multicanal a partir do card *(spec #141, implementado)*

Como pessoa do time comercial, quero enviar um follow-up de WhatsApp ou e-mail direto do card do lead, para reengajar sem sair do CRM.

**Rules:**
- WhatsApp exige opt-in explícito registrado (timestamp + texto exibido ao lead) antes do botão de envio ficar disponível — política Meta.
- Sem opt-in, ou sem `WHATSAPP_TOKEN`/`WHATSAPP_PHONE_ID` configurado, o botão fica desabilitado com mensagem honesta (nunca finge que enviou).
- E-mail exige `RESEND_API_KEY` configurada (domínio validado) e que o contato do lead pareça um e-mail (`@`) — senão mostra mensagem de integração pendente/canal não aplicável.
- Todo envio bem-sucedido é auditado em `lead_followups` (canal, template, quem enviou, quando).

**Edge cases:**
- Envio falha (erro da API do Resend/Meta) → erro aparece inline no card (não numa tela de erro genérica), nada é gravado em `lead_followups`.
- Domínio de teste do Resend (ex.: `example.com`) → API rejeita e o erro chega ao operador com a razão exata.

### US07: Ver a conversa real do bot no card do lead *(spec #308, implementado)*

Como pessoa do time comercial, quero abrir um lead vindo do bot e ler a transcrição completa da conversa, para ter contexto antes de contatar — sem depender só do resumo por IA.

**Rules:**
- Card do lead mostra as mensagens de `bot_mensagens` vinculadas via `conversa_id`, em ordem cronológica, separado das notas manuais (US01).
- Lead sem `conversa_id` (registrado manualmente) não mostra essa seção.

**Edge cases:**
- Conversa longa (muitas mensagens) → lista tem rolagem própria dentro do card, não estica o layout do kanban.

## 4. Fluxo de Negócio

```
Lead criado (via bot — PRD 020, ou registro manual — US04 com dedupe)
   │
   ▼
Vinculado a uma loja (loja_id)?
   ├── sim ──▶ Seller vê automaticamente no próprio painel
   └── não ──▶ Só admin vê ──▶ Admin atribui responsável manualmente ──▶ Aparece como "sem dono" até lá

Lead tem conversa (conversa_id)?
   ├── sim ──▶ Score + resumo por IA (throttlado) ──▶ Transcrição visível no card (US07)
   └── não (manual) ──▶ Sem score/resumo/transcrição

Responsável registra interação ou dispara follow-up (WhatsApp/e-mail)?
   ├── sim, dentro do prazo ──▶ Lead permanece "em dia"
   └── não, prazo estourado ──▶ Lead marcado como "atrasado" no painel *(não implementado nesta rodada)*

Status muda manualmente para:
   ├── convertido ──▶ Sai do funil de acompanhamento de atraso
   └── descartado ──▶ Sai do funil de acompanhamento de atraso
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| Toda interação registrada preserva autor e timestamp, nunca é perdida ou sobrescrita | Histórico é a base de confiança do time comercial; perder registro reintroduz o problema que a feature resolve | Registrar duas interações no mesmo lead por usuários diferentes e conferir que ambas aparecem no histórico |
| Lead sem responsável fica visualmente destacado em até a próxima carga do painel | Lead "órfão" é o cenário que mais gera perda de conversão | Criar lead sem atribuir dono e verificar destaque no painel |
| Cálculo de "atrasado" reflete o prazo configurado com precisão de 1 dia *(premissa — confirme o limiar aceitável)* | Time comercial precisa confiar no sinal para priorizar o dia de trabalho | Criar lead, aguardar o prazo, conferir mudança de destaque no painel |
| Filtro por responsável e por atrasado retorna resultado correto | Funcionalidade central do painel evoluído — sem filtro confiável, a feature não é usável no dia a dia | Aplicar filtro com múltiplos leads de diferentes responsáveis/status e conferir resultado |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| Taxa de conversão de lead (novo → convertido) | A levantar — painel `/admin/leads` não tem histórico suficiente ainda para baseline confiável | Aumento em relação ao baseline coletado nos primeiros 30 dias desta feature | 60 dias após lançamento | — | Time comercial |
| Tempo médio até a primeira interação registrada após criação do lead | A levantar | Reduzir para dentro do prazo de "atrasado" definido em US03 | 30 dias | — | Time comercial |
| % de leads sem responsável atribuído em um dado momento | A levantar | Próximo de 0% | 30 dias | — | Time comercial |

## 6. Milestones

### Milestone 1: Funil de leads com histórico e dono

**Por que é um marco:** transforma o painel de lista plana em ferramenta de trabalho real do time comercial — dá contexto (histórico) e responsabilidade (dono) a cada lead, resolvendo a perda de conversão por lead esquecido ou duplamente contatado.

**Funcionalidades:** US01, US02

**Checklist de aceite:**
- [x] Toda interação registrada preserva autor e timestamp, nunca é perdida ou sobrescrita *(verificado ao vivo em produção, 18/08/2026)*
- [x] Lead sem responsável fica visualmente destacado no painel *(verificado ao vivo)*

**Aprovador:** Time comercial + Andréia

### Milestone 2: Alerta de lead atrasado

**Por que é um marco:** fecha o ciclo de acompanhamento — sem isso, um lead com dono pode ainda ficar esquecido; com o alerta, o time tem um sinal ativo de priorização.

**Funcionalidades:** US03

**Checklist de aceite:**
- [ ] Cálculo de "atrasado" reflete o prazo configurado
- [ ] Filtro por atrasado retorna resultado correto

**Aprovador:** Time comercial

**Status:** não implementado — o painel evoluiu para kanban (Milestone 3) sem essa peça; segue como próximo incremento pendente, sem data.

### Milestone 3: Kanban com IA, dedupe, follow-up e transcrição *(spec #141/#308, implementado)*

**Por que é um marco:** transforma o painel numa ferramenta de trabalho completa — visão de funil de relance (kanban), priorização automática (score/resumo por IA), prevenção de duplicidade (dedupe), reengajamento sem sair da tela (follow-up) e contexto completo antes de contatar (transcrição). Entrega o valor comercial central que o PRD 020 US03/US05 apontava como objetivo.

**Funcionalidades:** US04, US05, US06, US07

**Checklist de aceite:**
- [x] Kanban mostra as 4 colunas de status, mesmo vazio *(verificado ao vivo — achado de QA: caía em EmptyState com 0 leads, corrigido)*
- [x] Dedupe bloqueia contato duplicado com mensagem inline, sem crashar a página *(verificado ao vivo — achado de QA: erro derrubava a página, corrigido via useActionState)*
- [x] Score e resumo aparecem no card após o bot registrar/atualizar o lead *(verificado ao vivo — score "quente" e resumo reais gerados numa conversa de teste)*
- [x] Follow-up de e-mail funciona de ponta a ponta (domínio Resend validado) *(verificado ao vivo — envio real bem-sucedido para endereço sandbox)*
- [x] Follow-up de WhatsApp exige opt-in antes de habilitar o envio *(verificado ao vivo — mensagem correta de integração pendente sem token configurado)*
- [x] Transcrição da conversa aparece no card do lead *(verificado ao vivo, spec #308)*

**Aprovador:** Andréia

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| Prazo de "atrasado" mal calibrado (curto demais gera ruído, longo demais perde o efeito) | Médio — time ignora o alerta se ele for ruidoso | Validar o prazo com o time comercial antes de fixar o valor definitivo | Pendente — feature ainda não implementada (US03) |
| Falta de baseline de conversão anterior a esta feature | Baixo — não bloqueia a entrega, mas dificulta medir sucesso real | Coletar baseline nos primeiros 30 dias pós-lançamento como ponto de partida | Pendente |
| Dependências do mapa de CRM (#124) ainda abertas — dono do seller (#125), estágios finais do pipeline (#126), shape multi-fonte (#132) — a implementação adotou defaults documentados enquanto essas issues não fecham | Médio — se a decisão final divergir do default adotado, exige migration de ajuste | Defaults documentados nas Decisões de produto (§2); revisar quando as issues do mapa fecharem | Monitorando |
| Fonte dupla de verdade entre WhatsApp opt-in (Meta) e o registro no CRM | Baixo — opt-in é sempre um passo manual e auditado (timestamp + texto), sem automação que possa dessincronizar | Nenhuma ação necessária — desenho já exige confirmação humana em cada envio | Aceito |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| PRD 020 — bot de atendimento (tabela `leads`, painel `/admin/leads`) | Interna | Em produção (falta ativação plena do WhatsApp) | Sem a tabela/painel base, esta feature não tem onde se apoiar |
| Domínio Resend validado (follow-up de e-mail, US06) | Externa (Resend) | Resolvido em 18/08/2026 | Sem isso, follow-up de e-mail ficaria com mensagem de "integração pendente" |
| `WHATSAPP_TOKEN`/`WHATSAPP_PHONE_ID` configurados (follow-up de WhatsApp, US06) | Interna (config) | Pendente em produção | Follow-up de WhatsApp mostra "integração pendente" até configurar |

## 8. Referências

- [PRD 020 — Bot de Atendimento](020-bot-atendimento.md) — origem da tabela `leads` e do painel `/admin/leads` que esta feature estende
- [Issue #141](https://github.com/Schneider-Gr/industria24hIA/issues/141) / [PR #302](https://github.com/Schneider-Gr/industria24hIA/pull/302) — spec e implementação do kanban, dedupe, scoring, follow-up
- [Issue #308](https://github.com/Schneider-Gr/industria24hIA/issues/308) / [PR #310](https://github.com/Schneider-Gr/industria24hIA/pull/310) — histórico logado, contato auto-preenchido, transcrição

## 9. Registro de Decisões

- **2026-07-28:** escopo restrito a "gestão do funil de leads" (histórico, dono, atraso), descartando neste PRD as opções de CRM de comprador (visão 360°/LTV) e CRM de seller (saúde de conta/onboarding), levantadas como alternativas mais amplas de "CRM industria24h". Motivo: escolha explícita do usuário entre as opções apresentadas — as outras duas permanecem candidatas a PRDs futuros e independentes.
- **2026-07-28:** dependência de `001` registrada porque esta feature estende diretamente a tabela `leads` e o painel `/admin/leads` criados naquele PRD — não é apenas "do mesmo domínio", a implementação pressupõe o schema já existente.
- **2026-08-18 (spec #141):** painel virou kanban (não tabela) por decisão de implementação, revisando a US01 original ("ver leads num kanban por estágio, saúde do funil de relance") que não estava clara no PRD original. Dono do seller resolvido como visibilidade automática via `loja_id`, não rodízio — default documentado enquanto a issue #125 do mapa de CRM (#124) segue aberta.
- **2026-08-18/19 (spec #141/#308):** US03 (alerta de atrasado) não foi implementada nesta rodada — o esforço foi redirecionado para scoring por IA, dedupe, follow-up e transcrição, que emergiram como prioridade maior no brainstorm de origem. Fica registrada como pendência explícita, não abandonada silenciosamente.
