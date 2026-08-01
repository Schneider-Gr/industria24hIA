# Brainstorm — Bot de atendimento multi-persona + funil no CRM

Data: 01/08/2026
Lente aplicada: especificação de projeto de desenvolvimento (confirmada com o usuário)
Estado desta sessão: consolidado (Fase 4). Não seguiu para PRD nem implementação.

## Contexto

Pedido original: criar um bot assistente de atendimento para industria24.com.br
capaz de entender todo o funcionamento do marketplace lendo os PRDs, fazer
pré-atendimento de 4 personas (consumidor, seller, motorista, afiliado), tirar
dúvidas no chat, registrar cada etapa num funil no CRM, e só depois de esgotar
a jornada oferecer contato humano (capturando nome/e-mail/WhatsApp,
persistidos no CRM).

### O que já existia em produção (levantado por investigação de memória, não pelo usuário)

Um bot de atendimento já está em produção desde 28/07/2026 (PR #123):

- Tabelas Supabase `bot_conversas` / `bot_mensagens` / `leads` (RLS admin-only,
  escrita via service role).
- `src/lib/ai/systemPrompt.ts`: conteúdo curado manualmente a partir das
  skills de projeto — ponto único de manutenção do que o bot sabe, mas exige
  atualização manual sempre que uma regra de negócio muda.
- Tools do modelo: `buscar_pedido`, `registrar_lead`, `abrir_chamado`.
- Canais: widget no site (`ChatWidget.tsx`, anônimo ou logado) e WhatsApp
  (`/api/bot/whatsapp/webhook`), usando `enviarWhatsapp` de `src/lib/whatsapp.ts`.
- Painel `/admin/leads` com triagem por status (novo/em_contato/convertido/descartado).
- Pendência de segurança já registrada e não fechada: o webhook do WhatsApp
  não valida `X-Hub-Signature-256`.
- Os PRDs formais do marketplace vivem no Confluence (espaço IND24H, 16
  páginas) e no Jira Product Discovery (MPDD), não como arquivos soltos.

Essa descoberta reformulou o escopo do brainstorm: a pergunta deixou de ser
"como construir o bot" e passou a ser "como evoluir o bot existente para
diferenciar persona, funil e fonte de PRD real".

## Decisões

### Base do bot: evoluir o existente, não comprar plataforma

Pesquisa de mercado feita antes de decidir (pedido explícito do usuário):

- **Kapso** (o MCP já conectado nesta conta) não aparece em nenhum resultado
  público sob esse nome. Os tools do MCP (`whatsapp_numbers`,
  `whatsapp_conversations`, `whatsapp_templates`, `whatsapp_webhooks`)
  sugerem que é infraestrutura de canal WhatsApp (números, templates,
  webhooks), não uma plataforma de CRM/funil. **Inferido, não verificado** —
  confirmar o que o Kapso MCP realmente oferece antes de descartá-lo como
  opção de canal.
- **Chatwoot** (self-host, US$19–99/agente/mês, inbox unificado + assistente
  de IA "Captain") e **Intercom Fin** (US$0,99 por conversa resolvida em
  2026) resolvem "inbox de atendimento humano com IA genérica", mas nenhum
  dos dois tem acesso nativo ao schema do marketplace (pedidos, comissão de
  afiliado, papel do usuário). Verificado via busca web em 01/08/2026 —
  fontes: [Chatwoot vs Intercom 2026](https://opsily.com/blog/chatwoot-vs-intercom).
- Conclusão: comprar a camada de inbox não elimina construir a camada de
  domínio (que já existe e funciona). Trocar de base jogaria fora a
  integração Supabase já validada sem ganho equivalente.

**Decisão: evoluir o bot em produção.** Manter Supabase + WhatsApp + widget
como estão.

### Fonte de PRD: busca sob demanda, não RAG vetorial

O usuário pediu que o bot "sempre leia os PRDs" e, na pergunta de
esclarecimento, optou por "RAG em tempo real sobre Confluence/PRDs" em vez do
padrão curado atual.

Pesquisa feita antes de fechar a decisão de arquitetura (verificado via busca
web em 01/08/2026 — fonte: [RAG Chatbot Architecture 2026](https://www.getwidget.dev/blog/rag-chatbot-architecture/)):
um pipeline RAG vetorial completo (embeddings + vector DB + rerank + confidence
gating) custa entre US$0,95 e US$2,40 por request e adiciona 1,2–2,4s de
latência — dimensionado para bases de milhares de documentos. O espaço
Confluence IND24H tem **16 páginas**. Nesse volume, pipeline vetorial é
desproporcional.

**Decisão: busca por palavra-chave sob demanda direto na API do Confluence**
(CQL `content/search`), chamada quando a pergunta do usuário exigir detalhe
específico de PRD, trazendo o conteúdo relevante para o contexto da resposta
— sem embeddings, sem vector DB, sem infraestrutura nova. Isso também resolve
o problema paralelo de que o `systemPrompt.ts` atual precisa ser atualizado à
mão sempre que um PRD muda: a busca sob demanda vira fonte viva.

**Ponto em aberto:** como cortar o conteúdo trazido (página inteira vs. seção
relevante) para não estourar contexto em páginas longas — decisão de
implementação, não tratada nesta rodada.

### Persona: 4 system prompts especializados + identificação explícita

Trade-off levantado: um único prompt com lógica condicional por persona tende
a virar colcha de retalhos conforme o escopo cresce; prompts especializados
por persona, compartilhando um núcleo comum de regras do marketplace, são
mais fáceis de manter e testar isoladamente.

Sobre como identificar a persona no início da conversa, três opções foram
avaliadas: pergunta explícita, inferência automática (por login/contexto), ou
híbrido. **Decisão do usuário: pergunta explícita no início** ("você é
comprador, vendedor, motorista ou afiliado?") — mais simples e sem risco de
erro de inferência, ao custo de adicionar um passo a toda conversa.

**Risco identificado:** sem esse passo, uma pergunta ambígua (ex.: motorista
escrevendo como se fosse consumidor) faz o roteamento de persona errar.

### Handoff humano: critério explícito, não "o bot decide sozinho"

O pedido original ("só depois de toda a jornada") foi identificado como
ambíguo sem um critério mensurável — do jeito que estava, ou o bot nunca
escalaria, ou escalaria cedo demais dependendo de interpretação.

Três opções levantadas: (a) N tentativas sem resolver OU pedido explícito;
(b) só pedido explícito do usuário; (c) número configurável a ajustar depois
com dados reais.

**Decisão do usuário: 2 tentativas sem resolver OU pedido explícito do
usuário a qualquer momento.** Equilibra a intenção original ("só depois da
jornada") com não frustrar quem não sabe que pode pedir para falar com
humano.

Quando o handoff dispara, o bot preenche nome, e-mail e WhatsApp e persiste
no CRM (esse ponto não foi questionado — já é o comportamento da tool
`registrar_lead` existente).

### CRM/funil: estender a tabela `leads` existente

Trade-off levantado: estender a tabela `leads` atual com campos `persona` e
`etapa_funil`, versus desenhar um pipeline Kanban novo por persona (no
padrão do CRM Kanban já usado no Visual Connect).

**Decisão do usuário: estender a tabela `leads` existente.** Reaproveita
schema, painel admin (`/admin/leads`) e alimenta diretamente os relatórios de
funil/RFM que já existem no CRM, sem inventar uma estrutura paralela.

**Ponto em aberto:** os valores exatos de `etapa_funil` por persona (quais
estágios cada uma percorre) não foram detalhados nesta rodada — fica para o
PRD, se for escrito.

## Riscos levantados

- Persona identificada errado na primeira mensagem se a pergunta explícita
  não for clara o suficiente.
- Busca CQL trazendo página inteira pode estourar contexto ou introduzir
  ruído em páginas longas — falta decidir o corte.
- Webhook do WhatsApp sem validação de assinatura Meta (`X-Hub-Signature-256`)
  é pendência de segurança anterior a este brainstorm; expandir o escopo do
  bot aumenta a superfície de risco antes de fechar esse buraco.
- Estender `leads` com `persona`/`etapa_funil` sem compatibilizar o filtro de
  status pode quebrar o painel `/admin/leads` atual.

## Oportunidades levantadas

- Busca sob demanda no Confluence elimina a manutenção manual do
  `systemPrompt.ts`, hoje ponto único e sujeito a ficar defasado.
- Funil por persona em `leads` alimenta os relatórios de funil/RFM que já
  existem no CRM do Visual Connect — reuso de padrão, sem dashboard novo.

## Pontos em aberto (não decididos nesta sessão)

1. Corte de conteúdo da página Confluence trazida pela busca CQL (página
   inteira vs. seção relevante) — motivo: decisão de implementação, adiada
   para quando o PRD/código for escrito.
2. Etapas exatas de `etapa_funil` por persona — motivo: fora do escopo de
   brainstorm de arquitetura, fica para especificação detalhada (PRD).
3. Confirmar o que o Kapso MCP oferece de fato antes de descartá-lo como
   opção de canal — motivo: inferido pelos nomes dos tools, não verificado
   contra documentação real.
4. Fechar a validação de assinatura do webhook WhatsApp — motivo: pendência
   de sessão anterior, não tratada aqui, mas citada como bloqueante para
   aumentar o tráfego do bot com segurança.

## Próximo passo

Consolidado e documentado a pedido do usuário. Não seguiu para PRD formal
nem para implementação — decisão explícita de parar aqui nesta rodada.
