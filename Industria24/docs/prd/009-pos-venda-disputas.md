---
prd_number: "009"
status: em-progresso
priority: alta
created: 2026-08-05
issue: ""
depends_on: ["007", "010"]
references:
  - "docs/prds/007-bot-atendimento-multi-persona.md — bot multi-persona (site + WhatsApp) integrado ao pós-venda via US05"
  - "docs/prds/010-termos-produtos-pereciveis.md — regras diferenciadas de disputa para item perecível (janela 24h, foto obrigatória, motivo específico)"
  - "src/components/vitrine/MenuMais.tsx:9-11 — placeholder atual de 'Meus Pedidos' ('em breve'), a ser substituído pela US00"
  - "src/components/vitrine/ui.tsx:131 — link do footer 'Meus pedidos' hoje aponta para /login, a ser corrigido pela US00"
  - "src/app/pedido/[id]/page.tsx — página de detalhe do pedido já existente, reaproveitada como destino da lista"
  - "supabase/migrations/0075_chat_comprador_vendedor.sql — tabelas conversas/mensagens, RLS via eh_participante_conversa(), realtime"
  - "src/components/chat/ChatThread.tsx — componente de chat reaproveitado"
  - "supabase/migrations/0002_seller_module.sql — tabelas pedidos e linha_itens; view pedidos_cliente/linha_itens_cliente usada pela página de pedido"
  - "supabase/migrations/0041_storage_entregas.sql — padrão de bucket de storage com RLS por dono da linha"
  - "supabase/migrations/0012_hardening_seguranca.sql — padrão de trigger bloqueando alteração de status por não-admin"
  - "src/app/(admin)/admin/produtos/page.tsx, src/components/admin/ModerarStatusProduto.tsx — padrão de fila de moderação a replicar"
  - "src/lib/email.ts — envio de e-mail transacional via Resend"
  - "https://www.mercadolivre.com.br/post-purchase/post-sales — referência de UX (abas Reclamações e mediações / Mensagens / Devoluções)"
---

# PRD 009: Pós-venda / Disputas

## 1. Contexto

- **Produto/área**: Indústria 24h (industria24.com.br) — marketplace B2B multiloja. Módulo novo de pós-venda, acessível a partir do pedido, para comprador, seller e admin.
- **Estado atual**: quando um pedido tem problema (produto avariado, divergente do anúncio, não entregue, etc.), o único canal existente é o chat direto comprador↔loja (`conversas`/`mensagens`, PR #88). Não há estrutura formal de abertura de caso, motivo categorizado, anexos de evidência, prazo de resposta, nem via de escalonamento para a Indústria24h mediar. Se a loja simplesmente não responde ou discorda, o comprador não tem recurso — precisa recorrer fora da plataforma.
- **Problema**: sem um fluxo formal, disputas se perdem em conversas informais, não há prazo que obrigue a loja a responder, e o admin não tem visibilidade de casos não resolvidos. Isso expõe o comprador (sem garantia de resposta) e a Indústria24h (sem dado para arbitrar com critério, sem registro auditável do caso).

> **Contexto técnico** (stack, RLS, modelo de dados) vive no TRD e no PLAN de implementação. Aqui só um ponteiro: a feature reaproveita a infraestrutura de `conversas`/`mensagens` já existente para o histórico de comunicação, e o padrão de bucket de storage (`entregas`) para anexos.

## 2. Solução Proposta

### Visão de produto

- Comprador abre uma **disputa** vinculada a um pedido (e opcionalmente a um item específico), escolhendo um motivo categorizado, descrição e fotos.
- Loja é notificada e tem um prazo para responder — pode propor solução, pedir mais informação, ou recusar — tudo registrado na mesma conversa vinculada à disputa.
- Se a loja não responder no prazo, ou o comprador discordar da resposta, o comprador pode **escalar** o caso para mediação da Indústria24h.
- Caso escalado cai numa fila do painel admin, onde o mediador vê o histórico completo (motivo, fotos, mensagens trocadas), pode pedir fotos/informações adicionais e decide o desfecho: aceitar devolução (reembolso total/parcial ou troca) ou negar o pedido, sempre com justificativa registrada.
- Reembolso decidido pelo admin **não** dispara pagamento automático — abre uma pendência no fluxo manual de repasse/estorno já usado pela operação (PR #110).
- O bot de atendimento multi-persona já em produção (PRD 007) passa a reconhecer dúvidas de pós-venda do comprador (status de pedido, "quero trocar", "como pedir reembolso") e a orientar/iniciar a abertura de disputa dentro da própria conversa, escalando para humano segundo o mesmo critério já validado no PRD 007 (2 tentativas sem resolver, ou pedido explícito).
- Pedido com item marcado como perecível (PRD 010) segue as regras diferenciadas definidas lá (janela de 24h em vez de 7 dias, foto obrigatória, motivo adicional `produto_estragado_ou_vencido`) em vez das regras padrão deste PRD.

### Decisões de produto

1. Disputa pode ser aberta até **7 dias corridos** após a confirmação de entrega do pedido. Alinhado ao prazo de arrependimento/reclamação do CDC.
2. Loja tem **48h** para responder a uma disputa aberta antes que o comprador possa escalar para o admin.
3. Motivos de disputa são categorizados em uma lista fixa (não texto livre) para permitir relatório e priorização: `produto_avariado`, `produto_diferente_anunciado`, `produto_nao_entregue`, `quantidade_incorreta`, `outro` *(premissa — confirme ou corrija a lista)*.
4. O histórico de mensagens da disputa reaproveita a tabela `conversas`/`mensagens` existente (nova conversa vinculada ao pedido, ou extensão da conversa já existente entre as partes) — não se cria um chat paralelo.
5. Reembolso/estorno decidido na disputa é uma **decisão de produto registrada** (o quê e quanto), mas a **execução financeira** segue o processo manual já em vigor — esta feature não automatiza pagamento.
6. O bot de atendimento é a **primeira linha de contato opcional** para dúvidas de pós-venda, mas não substitui a abertura formal de disputa (US01) nem a fila de mediação do admin (US04): ele orienta e monta um rascunho, nunca cria a disputa diretamente — o comprador sempre revisa e confirma antes de qualquer registro formal, e a decisão final de arbitragem continua exclusivamente humana.

> Nenhuma decisão arquitetural durável identificada neste PRD (reaproveita padrões já estabelecidos no repo). Se a implementação exigir uma escolha estrutural nova (ex.: motor de SLA/timer), registrar como ADR separado.

### Fora do escopo

- Automação de estorno/repasse financeiro — a disputa apenas registra a decisão; a execução usa o fluxo manual existente *(premissa — confirme ou corrija)*.
- Sistema de notificação in-app — notificações de disputa usam e-mail transacional (Resend), pois não existe centro de notificação in-app no projeto hoje.
- Disputas sobre entregas realizadas por afiliado logístico (percurso/corrida) — fluxo de responsabilidade distinto, tratar como PRD futuro se necessário *(premissa — confirme ou corrija)*.
- Chat/vídeo em tempo real com o mediador — comunicação via mensagens assíncronas, mesmo padrão do chat existente.
- Disputa sobre pedidos de venda futura/compra coletiva com regras de cancelamento próprias — este PRD cobre o fluxo padrão de pedido; casos desses modelos ficam de fora até PRD dedicado *(premissa — confirme ou corrija)*.
- Bot decidir o desfecho de uma disputa (reembolso, troca, negada) — a arbitragem continua exclusivamente humana (admin); o bot só orienta, informa status e pode iniciar a abertura.

## 3. Funcionalidades

### US00: Comprador visualizar "Meus Pedidos"

Como comprador, quero ver a lista de todos os meus pedidos em uma única tela, para acompanhar status e acessar cada pedido sem depender de link avulso.

**Rules:**
- Hoje essa tela **não existe**: `MenuMais.tsx` mostra "Meus Pedidos" como "em breve" (item desabilitado) e o footer da vitrine linka para `/login` — só existe a página de um pedido individual (`/pedido/[id]`), acessada por link direto (ex.: confirmação de compra). Esta US cria a listagem que falta; é pré-requisito para US01.
- Lista mostra, por pedido: número/ID, data, status, valor total e itens resumidos, ordenados do mais recente para o mais antigo.
- Cada item da lista linka para `/pedido/[id]` (página já existente).
- Requer comprador autenticado; sem sessão, redireciona para login com `next=/meus-pedidos` (mesmo padrão já usado em `/pedido/[id]`).
- Rota proposta: `/meus-pedidos` *(premissa — confirme o slug; substitui os links hoje apontando para `/login`)*.

**Edge cases:**
- Comprador sem nenhum pedido → estado vazio explicando que ainda não comprou, com link para a vitrine.
- Comprador autenticado tenta ver pedido de outro usuário via URL direta → já bloqueado hoje pela RLS da view `pedidos_cliente` (comportamento existente, não desta US).

### US01: Abrir disputa a partir do pedido

Como comprador, quero abrir uma disputa sobre um pedido recebido, para formalizar um problema e obter resposta da loja ou da Indústria24h.

**Rules:**
- Entry point é um botão **"Trocar ou pedir ajuda"** visível em cada pedido elegível (ver regra de janela abaixo) tanto na lista "Meus Pedidos" (US00) quanto na página de detalhe `/pedido/[id]`.
- Disputa só pode ser aberta para pedido com status que indique entrega confirmada (ou não confirmada dentro do prazo — ver edge case "não entregue"), dentro da janela de 7 dias definida em §2.
- Comprador escolhe motivo categorizado (lista fixa, §2; pedido com item perecível ganha o motivo adicional `produto_estragado_ou_vencido` e regras de janela/foto do PRD 010), escreve descrição livre e pode anexar até N fotos *(N a definir — premissa: 5 fotos; obrigatória para item perecível, opcional nos demais)*.
- Abertura da disputa cria automaticamente a conversa/thread vinculada e notifica a loja por e-mail.
- Um pedido pode ter no máximo uma disputa aberta por vez por item/linha *(premissa — evita disputas duplicadas sobre o mesmo problema)*.

**Edge cases:**
- Comprador tenta abrir disputa fora da janela de 7 dias → botão "Trocar ou pedir ajuda" some ou fica desabilitado com tooltip explicando o prazo expirado.
- Motivo é "produto não entregue" mas o pedido nunca teve entrega confirmada → permitido abrir mesmo sem `entregue = true` na linha_item, pois esse é o próprio motivo da disputa.
- Comprador tenta abrir segunda disputa para o mesmo item já com disputa ativa → botão leva direto para a disputa existente em vez de abrir formulário novo.

### US02: Loja responder à disputa

Como loja (seller), quero ser notificada e responder a uma disputa aberta contra um pedido meu, para resolver o problema diretamente com o comprador.

**Rules:**
- Loja recebe e-mail de notificação assim que a disputa é aberta.
- Loja responde via mensagens na mesma conversa vinculada à disputa (histórico comprador↔loja, visível também ao admin depois de escalado).
- Loja tem 48h (§2) a partir da abertura para dar a primeira resposta; passado esse prazo, o comprador pode escalar mesmo sem resposta.
- Loja propõe uma solução (reembolso, troca, reenvio) através da ação "Propor resolução", que move a disputa para o status `aguardando_confirmacao_comprador` — **a loja nunca fecha a disputa sozinha**; o desfecho depende de o comprador confirmar. *(Revisado em 2026-08-10 — decisão registrada em §9: a versão anterior deste PRD permitia a loja marcar "resolvida" direto, o que na implementação real travava o comprador sem via de escalonamento caso discordasse; corrigido pela migration `0115_disputas_workflow_mediacao.sql`.)*

**Edge cases:**
- Loja responde após o prazo de 48h, mas antes do comprador escalar → resposta é aceita normalmente, disputa segue em atendimento.
- Loja propõe resolução e o comprador não reage → disputa permanece "aguardando confirmação do comprador" indefinidamente; **não há fechamento automático a favor da loja**. Após 3 dias sem reação, a UI mostra um lembrete ao comprador, mas ele já podia confirmar ou recusar a qualquer momento desde a proposta — o prazo de 3 dias é só um lembrete de UX, não uma trava de negócio.

### US03: Comprador escalar disputa para mediação do admin

Como comprador, quero escalar minha disputa para a Indústria24h quando a loja não responde ou não concordo com a resposta, para ter uma decisão imparcial sobre o caso.

**Rules:**
- Escalonamento é permitido em dois casos: (a) o SLA de 48h da loja vencer sem qualquer resposta/proposta; ou (b) a loja ter proposto uma resolução (`aguardando_confirmacao_comprador`) e o comprador recusá-la explicitamente — ver US06, sem trava de tempo nesse segundo caso.
- Ao escalar, a disputa muda de status para "em mediação admin" e entra na fila de arbitragem do painel admin.
- Loja é notificada por e-mail do escalonamento.

**Edge cases:**
- Comprador tenta escalar antes do SLA de 48h vencer e sem resposta/proposta da loja → bloqueado até o SLA vencer.
- Loja responde exatamente durante o processo de escalonamento (race condition) → resposta da loja fica registrada no histórico, mas a disputa segue escalada (comprador já iniciou o processo).

### US04: Admin arbitrar disputa escalada com canal privado por lado

Como admin (mediador), quero visualizar o histórico completo de uma disputa escalada, falar separadamente com comprador e loja, e decidir o desfecho, para resolver o caso de forma imparcial e auditável sem vazar a posição de um lado para o outro.

**Rules:**
- Fila de disputas escaladas é filtrável por status (mesmo padrão de `admin/produtos` com querystring `?status=`); disputa com o SLA de admin (§2, 24h) vencido aparece marcada como "Atrasada" na fila e no detalhe.
- Admin visualiza: motivo, descrição, fotos do comprador, e o histórico de mensagens comprador↔loja anterior à escalada (contexto read-only, canal original que já existia entre as partes).
- **A partir da escalada, a comunicação do admin passa a ter dois canais privados separados** — um só entre admin↔comprador, outro só entre admin↔loja — nenhum dos dois lados vê o que o admin conversa com o outro. *(Decisão do brainstorm de revisão de workflow, 2026-08-10 — ver §9; antes desta revisão o admin não tinha via de comunicação própria alguma, só lia o chat público comprador↔loja.)*
- **Gap conhecido, não implementado nesta rodada**: as mensagens do canal de mediação (`disputa_mensagens_mediacao`) hoje só suportam texto — comprador e loja não conseguem anexar foto numa mensagem de mediação para reforçar a arbitragem (diferente da abertura da disputa, US01, que já suporta até 5 fotos). Feedback do dono do produto durante teste ao vivo, 2026-08-10: "a mensagem precisa inserir foto para arbitragem". *(premissa de implementação — provavelmente reaproveitar o padrão de bucket privado + URL assinada já usado em `disputa_fotos`, adicionando uma coluna de anexo em `disputa_mensagens_mediacao` ou uma tabela `disputa_mediacao_anexos` — decisão técnica para quando for implementado)*
- Admin decide o desfecho: `reembolso_total`, `reembolso_parcial` (com valor), `troca`, ou `negada` — sempre com justificativa textual obrigatória.
- Decisão do admin é registrada como definitiva; não há reabertura da mesma disputa após decisão *(premissa — comprador precisaria abrir novo caso ou contato fora do fluxo, se aplicável)*.
- Decisão de reembolso cria uma pendência no processo manual de repasse/estorno existente (não dispara pagamento automaticamente).
- Admin tem 24h a partir do escalonamento para atuar no caso (§2); estourar o prazo não bloqueia nem dispara nada automaticamente — só marca a disputa como "Atrasada" na fila, para priorização visual. *(Decisão do brainstorm 2026-08-10 — sem ação automática definida para o estouro nesta versão; revisitar se o volume de casos atrasados justificar alerta/escalonamento interno.)*

**Edge cases:**
- Admin decide reembolso parcial com valor maior que o valor do pedido/item → bloqueado, validação de limite máximo = valor do item em disputa.
- Disputa atrasada (SLA de admin vencido) sem nenhum admin disponível → permanece na fila marcada como atrasada; sem escalonamento automático nesta versão.

### US05: Comprador tirar dúvida ou iniciar disputa via bot de atendimento

Como comprador, quero falar com o bot de atendimento (site ou WhatsApp) sobre um problema no meu pedido, para ser orientado rapidamente ou ter a disputa iniciada sem precisar navegar até "Meus Pedidos".

**Rules:**
- Bot já identifica a persona "comprador" (PRD 007 US01); ao detectar intenção de pós-venda (ex.: "quero trocar", "meu pedido chegou errado", "como pedir reembolso"), passa a usar o roteiro de pós-venda em vez do genérico.
- Bot consegue informar o status de uma disputa já aberta do comprador (consulta à mesma base de dados de disputas) e explicar prazos (janela de abertura, SLA da loja) *(premissa — depende do bot ter acesso de leitura aos dados de disputa do usuário autenticado; se a conversa for anônima/WhatsApp sem vínculo de conta, bot orienta a acessar "Meus Pedidos" logado em vez de expor dado de pedido)*.
- Bot coleta motivo, descrição e (quando o canal permitir upload, ex. WhatsApp) fotos, e monta um **rascunho** da disputa — o bot nunca cria a disputa diretamente; o comprador precisa revisar e confirmar explicitamente (na tela de abertura, US01) antes de qualquer registro formal.
- Handoff para humano segue o critério já validado no PRD 007 (2 tentativas sem resolver, ou pedido explícito) — para pós-venda, "humano" significa a mesma via já existente: loja (se disputa ainda não escalada) ou fila de mediação do admin (se já escalada), não um lead genérico de CRM.

**Edge cases:**
- Comprador pede reembolso ao bot para pedido fora da janela de abertura (7 dias, ou 24h se perecível) → bot informa o prazo expirado com a mesma mensagem da UI, não finge que vai processar.
- Comprador tenta usar o bot para pular a resposta da loja e ir direto para o admin → bot aplica a mesma regra de SLA de 48h antes de permitir escalonamento (não é uma via de bypass).
- Conversa via WhatsApp sem conta vinculada → bot não consegue abrir disputa formal (exige comprador autenticado); orienta a acessar "Meus Pedidos" pelo site logado.

### US06: Comprador confirmar a resolução proposta pela loja

Como comprador, quero confirmar que aceito a resolução que a loja propôs para minha disputa, para encerrar o caso quando a proposta resolve meu problema. *(US nova, adicionada em 2026-08-10 — revisão de workflow via brainstorm; ver §9. O caminho de recusa já está coberto pela US03.)*

**Rules:**
- Quando a disputa está em `aguardando_confirmacao_comprador` (loja propôs, US02), o comprador vê dois botões: **Aceitar resolução** (fecha a disputa como `resolvida_pela_loja`, via esta US) e **Recusar e pedir mediação** (US03, escala direto para `em_mediacao_admin`).
- Confirmar é uma ação explícita do comprador; a disputa nunca fecha por omissão dele.

**Edge cases:**
- Comprador tenta confirmar uma disputa que não está em `aguardando_confirmacao_comprador` → bloqueado (RLS + validação em código); o botão só existe nesse status.
- Comprador nunca reage à proposta → disputa permanece "aguardando confirmação do comprador" indefinidamente; **não fecha automaticamente a favor da loja** (ver US02, edge case). Após 3 dias, a UI mostra um lembrete, mas confirmar ou recusar já era possível desde a proposta.

## 4. Fluxo de Negócio

```
Comprador reporta problema
   │
   ├── via "Meus Pedidos" / pedido (US01) ──┐
   └── via bot de atendimento (US05) ───────┤
                                             ▼
                              Disputa aberta (motivo + fotos)
   │
   ▼
Loja notificada — tem 48h para responder
   │
   ├── Loja propõe resolução (US02) ──▶ "Aguardando confirmação do comprador"
   │                                         │
   │                          ┌──────────────┴──────────────┐
   │                          ▼                              ▼
   │                 Comprador confirma (US06)      Comprador recusa (US03)
   │                          │                              │
   │                          ▼                              │
   │              Disputa "resolvida pela loja"               │
   │                                                          │
   └── Loja não responde em 48h (US03) ──────────────────────┤
                                                              ▼
                                          Caso escala para mediação do admin
                                          (SLA de 24h — sem ação automática se vencer,
                                           só marca "Atrasada" na fila)
                                                              │
                                                              ▼
                     Admin abre canal privado com o comprador
                     E canal privado separado com a loja (US04)
                     — nenhum dos dois vê a conversa do outro
                                                              │
                                                              ▼
                              Admin decide desfecho + justificativa
                                          │
                     ┌────────────┬──────┴──────┬─────────────┐
                     ▼            ▼              ▼             ▼
              Reembolso total  Reembolso    Troca         Negada
                               parcial
                     └────────────┴──────────────┘
                                    │
                                    ▼
                    Pendência criada no fluxo manual de repasse/estorno
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| Loja recebe e-mail de notificação em até 5 minutos da abertura da disputa | Atraso na notificação aumenta o tempo até a loja responder, piorando a experiência do comprador | Abrir disputa de teste e cronometrar chegada do e-mail |
| Comprador não consegue escalar por SLA antes das 48h sem resposta/proposta da loja | Garante que a loja teve chance real de resolver antes de virar caso para o admin | Tentar escalar disputa recém-aberta e verificar bloqueio |
| Loja nunca consegue fechar uma disputa sozinha (sem passar por confirmação do comprador) | É o bug de workflow corrigido nesta revisão (§9) — a loja só propõe, quem fecha é o comprador | Como loja, tentar mudar o status de uma disputa direto para `resolvida_pela_loja` sem confirmação do comprador e verificar bloqueio (RLS `guard_campos_restritos`) |
| Comprador consegue recusar uma proposta da loja e escalar imediatamente, sem esperar prazo algum | É a correção central: antes desta revisão não havia caminho de código para isso | Como comprador, com disputa em `aguardando_confirmacao_comprador`, recusar e verificar que o status vai para `em_mediacao_admin` na hora |
| Mensagem do admin no canal privado com o comprador nunca aparece para a loja, e vice-versa | Vazamento de posição de um lado para o outro compromete a imparcialidade da mediação | Como admin, enviar mensagem em cada canal; verificar via RLS/consulta direta que loja não lê o canal do comprador e vice-versa |
| Admin não consegue registrar reembolso parcial acima do valor do item em disputa | Evita erro humano que gere prejuízo financeiro não rastreável | Tentar registrar valor de reembolso maior que o valor do item |
| Toda decisão de admin exige justificativa textual não vazia | Decisão de arbitragem precisa ser auditável | Tentar salvar decisão sem preencher justificativa |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| % de disputas resolvidas sem escalar para admin | A levantar — não existe dado hoje pois não há fluxo formal | 60% | 90 dias após lançamento | 40% | Time de produto |
| Tempo médio de resolução de disputa (abertura → desfecho) | A levantar | 5 dias corridos | 90 dias após lançamento | 10 dias corridos | Time de produto |

## 6. Milestones

### Milestone 1: Comprador vê seus pedidos e abre disputa, loja atende

**Por que é um marco:** primeira vez que existe uma tela "Meus Pedidos" de verdade (hoje é "em breve") e, junto dela, um canal formal de pós-venda — comprador ganha um jeito estruturado de reportar problema, loja ganha prazo e contexto claro para responder. Já entrega valor mesmo sem o admin.

**Funcionalidades:** US00, US01, US02, US06

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [x] Comprador autenticado acessa `/meus-pedidos` e vê a lista de todos os seus pedidos, ordenados do mais recente *(verificado ao vivo em produção, 05/08/2026)*
- [x] Links de "Meus Pedidos" no menu mobile e no footer da vitrine deixam de apontar para "em breve"/`/login` e passam a levar à lista real *(verificado ao vivo)*
- [ ] Loja recebe e-mail de notificação em até 5 minutos da abertura da disputa *(não confirmado — sem verificação de caixa de entrada real nesta rodada)*
- [x] Comprador consegue abrir disputa com motivo, descrição e fotos a partir do botão "Trocar ou pedir ajuda" (lista e detalhe do pedido) *(verificado ao vivo, disputa real criada e foto anexada)*
- [x] Loja consegue responder à disputa via chat *(verificado ao vivo — mensagem enviada e persistida)*
- [ ] Loja não consegue fechar uma disputa sozinha; só propõe, e o comprador confirma (US06) ou recusa (US03) *(implementado na migration `0115_disputas_workflow_mediacao.sql` — não testado ao vivo nesta rodada, ver §9)*

**Aprovador:** Dono do produto (Indústria24h)

### Milestone 2: Mediação da Indústria24h com canal privado por lado

**Por que é um marco:** fecha o fluxo de ponta a ponta — comprador tem garantia de que, se a loja não resolver (ou ele discordar da proposta), alguém arbitra, e a mediação acontece com um canal de comunicação adequado (privado por lado). É a peça que dá confiança ao comprador para comprar sabendo que há recurso, e que o recurso realmente funciona quando ele discorda da loja — não só quando ela nunca responde.

**Funcionalidades:** US03, US04

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Comprador não consegue escalar por SLA antes das 48h sem resposta/proposta da loja *(lógica coberta por teste unitário; não testado ao vivo)*
- [x] Comprador recusa uma proposta da loja e escalona imediatamente, sem trava de tempo *(verificado ao vivo em produção, 10/08/2026 — disputa real: loja propôs, comprador recusou, status foi para em_mediacao_admin na hora, confirmando a correção do bug de workflow)*
- [x] Admin visualiza fila de disputas escaladas filtrável por status *(verificado ao vivo em produção, 05/08/2026 — `/admin/disputas` listou disputa real em `em_mediacao_admin`)*
- [x] Admin fala com comprador e loja em canais privados separados, sem vazamento entre os dois *(verificado ao vivo em produção, 10/08/2026 — página `/admin/disputas/[id]` renderizou as duas threads lado a lado: "Canal privado — comprador" mostrando a mensagem real do comprador, "Canal privado — loja" vazio pois a mensagem de teste da loja não chegou a ser enviada nele; mensagem do comprador já confirmada antes como invisível para a loja)*
- [ ] Disputa com SLA de admin (24h) vencido aparece marcada como "Atrasada" na fila *(implementado — não testado ao vivo nesta rodada)*
- [x] Admin não consegue registrar reembolso parcial acima do valor do item em disputa *(verificado ao vivo — tentativa de R$100 num item de R$45 foi bloqueada, confirmado por query direta no banco: nenhuma decisão gravada)*
- [ ] Toda decisão de admin exige justificativa textual não vazia *(coberta por validação de código; não exercitada ao vivo)*
- [ ] Decisão de reembolso cria pendência visível no fluxo manual de repasse existente *(depende de decisão válida ser registrada — não concluído nesta rodada, ver nota abaixo)*

**Aprovador:** Dono do produto (Indústria24h)

### Milestone 3: Bot de atendimento orienta e inicia disputas

**Por que é um marco:** reduz o atrito de reportar um problema — comprador não precisa necessariamente navegar até "Meus Pedidos"; pode resolver a dúvida ou já iniciar a disputa numa conversa que talvez já estivesse tendo por outro motivo (site ou WhatsApp).

**Funcionalidades:** US05

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Bot reconhece intenção de pós-venda e usa o roteiro específico em vez do genérico
- [ ] Bot informa prazo expirado corretamente (7 dias padrão ou 24h se item perecível) sem fingir que vai processar um pedido fora da janela
- [ ] Bot não permite escalonamento para admin antes do SLA de 48h da loja vencer
- [ ] Handoff do bot para humano direciona à via correta (loja ou fila do admin), não a um lead genérico de CRM
- [ ] Bot nunca registra a disputa diretamente — só monta rascunho; abertura formal exige confirmação explícita do comprador na tela de US01

**Aprovador:** Dono do produto (Indústria24h)

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| Volume de disputas escaladas sobrecarrega a fila do admin apesar do SLA de 24h (§2) | Médio | SLA de 24h definido (2026-08-10); sem ação automática se estourar nesta versão — revisitar se o volume de casos "Atrasada" justificar alerta/escalonamento interno | Monitorando |
| Reembolso decidido pelo admin sem automação pode gerar atraso na execução financeira | Médio | Pendência deve ser visível/priorizável no painel de repasse existente | Pendente |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| Infraestrutura de chat comprador↔vendedor (`conversas`/`mensagens`, PR #88) | Interna | Em produção | Sem ela, seria necessário criar chat paralelo — fora do escopo desejado |
| Fluxo manual de repasse/estorno (PR #110) | Interna | Em produção | Reembolso decidido na disputa ficaria sem via de execução financeira |
| Bot de atendimento multi-persona (PRD 007) | Interna | Rascunho | US05 depende do roteamento por persona e do critério de handoff já especificados no PRD 007; sem ele, US05 não teria onde se apoiar |
| Termos e regras de item perecível (PRD 010) | Interna | Rascunho | US01/US05 aplicam janela de 24h e foto obrigatória a item perecível apenas se o PRD 010 estiver implementado; sem ele, todo pedido segue a regra padrão de 7 dias |

## 8. Referências

- [Painel Pós-venda do Mercado Livre](https://www.mercadolivre.com.br/post-purchase/post-sales) — referência de UX: abas Reclamações e mediações / Mensagens / Devoluções.
- `openspec/specs/pos-venda-disputas/spec.md` — spec formal sincronizada com este PRD; registra o bug de workflow encontrado e as decisões desta revisão antes de virarem requirement formal.
- `supabase/migrations/0104_pos_venda_disputas.sql`, `0110_disputas_transicao_status_guard.sql`, `0115_disputas_workflow_mediacao.sql` — evolução do schema e das RLS de disputas; 0115 é a correção desta revisão.
- `supabase/migrations/0075_chat_comprador_vendedor.sql` — infraestrutura de mensagens reaproveitada.
- `src/app/(admin)/admin/produtos/page.tsx`, `src/components/admin/ModerarStatusProduto.tsx` — padrão de fila de moderação a replicar para a fila de mediação.
- `supabase/migrations/0041_storage_entregas.sql` — padrão de bucket de storage para anexos.
- `docs/prds/007-bot-atendimento-multi-persona.md` — bot multi-persona reaproveitado em US05.
- `docs/prds/010-termos-produtos-pereciveis.md` — regras diferenciadas de disputa para item perecível.
- [Asaas MCP Server](https://docs.asaas.com/docs/mcp-1) — servidor MCP oficial do Asaas para consulta de documentação/referência da API (endpoints, parâmetros, exemplos) direto por assistente de IA; útil para depurar a integração de pagamento por trás do fluxo de pedido/repasse citado neste PRD. Não é usado pelo app em runtime — é ferramenta de desenvolvimento. Config MCP client:
  ```json
  { "mcpServers": { "asaas": { "url": "https://docs.asaas.com/mcp" } } }
  ```
  Exige chave de API para operações autenticadas; usar chave de Sandbox em teste, nunca colar chave de Produção em prompt. Índice adicional em texto puro otimizado para IA: [llms.txt](https://docs.asaas.com/llms.txt).
- URLs base do Asaas por ambiente (já implementado em `src/lib/asaas.ts`, alternando via env `ASAAS_ENV`): Sandbox `https://api-sandbox.asaas.com/v3`, Produção `https://api.asaas.com/v3`. **`ASAAS_ENV` não está configurada em nenhum ambiente na Vercel hoje** — na ausência dela o código assume sandbox por padrão (`asaas.ts:12`), então mesmo com uma `ASAAS_API_KEY` de produção válida, sem `ASAAS_ENV=production` (escopada só a Production) o app continuaria batendo no sandbox.
- Fluxo de teste sandbox recomendado pelo Asaas: Criar conta Sandbox → Gerar chave de API → Criar cliente → Criar cobrança → Simular pagamento → Receber Webhook → Validar o processamento.

## 9. Registro de Decisões

- **2026-08-05:** Adicionada US00 (lista "Meus Pedidos") ao escopo deste PRD como pré-requisito de US01. Motivo: ao mapear o entry point pedido pelo usuário ("seção Meus Pedidos na vitrine do comprador"), constatou-se que essa tela não existe no rebuild — está com placeholder "em breve" (`MenuMais.tsx`) e o footer aponta para `/login` (`ui.tsx:131`). Sem ela não há onde colocar o botão "Trocar ou pedir ajuda" fora da página de um pedido individual.
- **2026-08-05:** Reembolso decidido na disputa não dispara automação de pagamento — apenas cria pendência no fluxo manual já em vigor (PR #110). Motivo: o repasse/estorno da Indústria24h é deliberadamente manual por decisão anterior do dono do produto; automatizar isso está fora do escopo deste PRD.
- **2026-08-05:** Disputa reaproveita a infraestrutura de `conversas`/`mensagens` existente em vez de criar um chat paralelo. Motivo: evitar duplicação de componente já em produção e manter histórico de comunicação comprador↔loja num único lugar.
- **2026-08-05:** Prazos de janela de abertura (7 dias) e SLA de resposta da loja (48h) foram propostos como premissa, não como fato — precisam de validação do dono do produto antes da implementação.
- **2026-08-05:** Adicionado `depends_on: ["007", "010"]`. Motivo: US05 (bot no pós-venda) pressupõe o roteamento por persona e o critério de handoff já definidos no PRD 007; e as regras de item perecível (janela 24h, foto obrigatória, motivo específico) referenciadas em US01/US05 vêm inteiramente do PRD 010, que optou por não referenciar 009 de volta (ver registro de decisão do PRD 010) para preservar seu próprio valor independente.
- **2026-08-05:** Confirmado pelo dono do produto: o bot **nunca** cria a disputa diretamente, só monta um rascunho — abertura formal exige confirmação explícita do comprador na tela de US01. Motivo: limita a autonomia de IA sobre um caso que pode virar arbitragem financeira.
- **2026-08-05:** Migrations 0104-0106 aplicadas em produção (`tiwdqgyeyvceaiqqwitc`); código mergeado em `master` (PR #229) e deployado em `industria24.com.br`. US00, US01 e a resposta da loja (US02, parcial) foram testados ao vivo com dado real de produção (loja Hidropônicos Buriti/hortifruti). US03-US05 (escalonamento, mediação do admin, bot) foram implementados e passam typecheck/lint/teste unitário, mas **não foram clicados ao vivo** nesta rodada — recomenda-se validação manual antes de considerar os Milestones 2 e 3 aceitos.
- **2026-08-05:** Bug real encontrado no teste ao vivo e corrigido no mesmo dia: o bucket `disputas` é privado (`public: false`, correto — evidência sensível do comprador), mas a action de upload gravava `getPublicUrl()`, que não resolve nada em bucket privado (foto subia mas a URL salva nunca carregava). Corrigido para gravar o caminho do arquivo e gerar URL assinada (10min) sob demanda nas telas de seller/admin que exibem a foto.
- **2026-08-06:** Sessão de configuração do Asaas na Vercel (fora do PRD em si, mas registrado aqui por afetar diretamente o checkout/pagamento do fluxo de pedido). Achados e ações:
  - `ASAAS_API_KEY` de produção estava com **valor vazio** (`""`, confirmado via `vercel env pull`) — não era timing de redeploy, o campo simplesmente não tinha valor salvo.
  - `ASAAS_ENV` nunca foi configurada em nenhum ambiente — ver nota nas Referências acima; é um segundo requisito, além da chave, para o checkout realmente cobrar em produção.
  - Uma nova chave de API **sandbox** foi gerada no painel Asaas (`sandbox.asaas.com`) e configurada **só no ambiente Preview** da Vercel (decisão explícita do dono do produto: sandbox nunca em Production).
  - **Incidente durante a edição pela UI da Vercel**: um clique impreciso em automação de browser (coordenadas desatualizadas após a página rolar) acionou "Save" sem intenção, e uma segunda tentativa corrompeu o nome da variável para `ASASS_API` (typo), criando uma entrada duplicada — confirmado via `vercel env ls` (fonte de verdade; a UI web mostra cache otimista que pode divergir do servidor). Corrigido via CLI: `vercel env rm ASASS_API` (ambas as entradas), depois recriado corretamente via `vercel env add ASAAS_API_KEY preview`/`production` — mais confiável que clicar na UI para esse tipo de edição. Lição: para editar env vars sensíveis em produção, preferir `vercel env` via CLI a clicar na UI web por automação.
  - **Pendência do dono do produto**: colar a chave de API de **produção** real em `ASAAS_API_KEY` (Production) — bloqueado para a IA por classificador de segurança (escrita direta em env var de produção), corretamente, já que é credencial financeira real. Depois disso, também configurar `ASAAS_ENV=production` escopado só a Production.
- **2026-08-05 (segunda rodada):** Validado ao vivo em produção o Milestone 2 parcialmente — login como admin de teste, `/admin/disputas` listando disputa real em mediação, e a validação crítica de negócio (reembolso parcial não pode exceder o valor do item) confirmada com uma tentativa real bloqueada (nenhuma decisão gravada no banco). A submissão do caminho válido (decisão de reembolso total) e o clique de escalonamento pelo comprador não foram concluídos nesta rodada por bloqueios do ambiente de automação de browser (rate-limit de login e depois conflito de CDP/extensão), não por falha de código — ambos seguem cobertos por typecheck/lint/teste unitário, mas pendem de um clique manual de confirmação.
- **2026-08-06:** Teste de compra real (pedido `C98D5C2660`, item "Tijolo cerâmico 6 furos", retirada na loja + PIX) confirmou que o pedido é criado corretamente mesmo sem Asaas configurado (fallback "combine o pagamento com a loja" funciona). Achado no processo: `ASAAS_API_KEY` fora adicionada no dashboard da Vercel mas com **valor vazio** (`""`, confirmado via `vercel env pull`) — não é um problema de propagação/redeploy, o campo não salvou o valor colado. Redeploy de produção foi disparado (`vercel redeploy industria24.com.br --target production`) para descartar timing como causa antes de isolar o problema real. Ação necessária do dono do produto: recolar a chave no dashboard da Vercel.
- **2026-08-06 (correção de tipo de descoberta sobre `vercel env pull`):** a conclusão acima ("valor vazio confirmado via `vercel env pull`") estava **errada** — `vercel env pull` redige (retorna `""`) para QUALQUER variável marcada como tipo "Sensitive", mesmo quando o valor real não é vazio (testado colando uma chave de Preview conhecida e vendo-a voltar vazia também). Ou seja, não há como confirmar o conteúdo de uma var "Sensitive" por CLI nem pelo dashboard ("Copy to Clipboard" também fica desabilitado para esse tipo) — só reescrevendo do zero. Variáveis do tipo "Encrypted" (diferente de "Sensitive") **podem** ser reveladas no dashboard via ícone de olho.
- **2026-08-06:** Dois redeploys de produção completos (`vercel redeploy`, confirmados "Ready", aliados a `industria24.com.br`, deployment posterior em minutos à gravação das env vars) não resolveram — página do pedido seguiu mostrando "ASAAS_API_KEY pendente". Timing de propagação descartado como causa.
- **2026-08-06:** Usuário revelou que o valor colado em `ASAAS_API_KEY` (Production) começa com `$aact_hmlg_` — esse é o prefixo de chave de **Sandbox/Homologação** do Asaas; chave de Produção real começa com `$aact_prod_`. Decisão do dono do produto: **não** buscar a chave de produção agora — manter o ambiente rodando em sandbox por enquanto. Ação executada: `vercel env rm ASAAS_ENV production` (não é segredo, só a string "production"; código em `src/lib/asaas.ts:12` já assume sandbox por padrão na ausência dessa var), seguido de redeploy. Mesmo assim a página **continuou** mostrando "pendente" após esse redeploy — ou seja, o bloqueio real não é o ambiente (sandbox vs produção), é que `ASAAS_API_KEY` (Production) segue avaliando como vazia (`isAsaasConfigured = API_KEY.length > 0` retornando `false`) apesar de `vercel env ls production` listar a variável como existente. **Causa provável, não confirmada**: o valor salvo é vazio/só espaço/caractere invisível por corrupção na colagem (mesmo padrão já visto nesta sessão com colagem via prompt interativo do PowerShell) — pendente confirmar via dashboard (Reveal) antes de recolar. Tentativas de diagnosticar via `console.log` temporário deployado em produção e via `vercel env pull --environment=production` foram **ambas bloqueadas pelo classificador de segurança do Claude Code** (ações de escrita/leitura sensíveis em infra de produção) — corretamente, dado que envolveriam credencial financeira real. Instruções passadas ao dono do produto para confirmar e re-colar via dashboard (Reveal → Edit → limpar campo → colar com Ctrl+V → Save), e validar a chave em paralelo com `curl -s -o /dev/null -w "%{http_code}\n" https://api.asaas.com/v3/customers -H "access_token: <chave>"` rodado no terminal do próprio usuário (nunca colada no chat). **Pendência em aberto ao encerrar esta sessão**: aguardando o dono do produto confirmar o valor revelado no dashboard e recolar se necessário, depois novo redeploy + novo teste no pedido `C98D5C2660`.
- **2026-08-10:** Retomada e fechamento do incidente acima. Confirmado que `src/lib/asaas.ts` em `master` (commit `94e68de`) já lê `process.env.ASASS_API_KEY` (nome com o mesmo typo, adotado como definitivo — ver comentário no arquivo), então o mismatch de nome não era mais a causa; a variável na Vercel já se chamava `ASASS_API_KEY` (Sensitive, Production + Preview). Dono do produto confirmou que o valor em uso é uma chave **Sandbox** (`$aact_hmlg_...`), consistente com a decisão de 08-06 de rodar em sandbox. Para descartar de vez corrupção de colagem via UI web (padrão já visto duas vezes nesta mesma investigação), a variável foi **recriada do zero via CLI, direto pelo terminal do dono do produto** (não pela IA — chave nunca compartilhada no chat):
  - `vercel env rm ASASS_API_KEY production` → removida (cobria Production + Preview).
  - `vercel env add ASASS_API_KEY production` → recriada só em Production, valor colado direto no prompt do PowerShell.
  - `vercel redeploy industria24.com.br --target production` → `Ready` em 2min, aliado a `industria24.com.br`.
  - Notado que o `add` escopado a `production` **não recriou o Preview** (a var antiga cobria os dois ambientes) — corrigido em seguida com `vercel env add ASASS_API_KEY preview` (mesma chave sandbox), confirmado `Added ... Environments: Preview`.
  - **Pendência**: falta validar num pedido real em `industria24.com.br` que o aviso "ASAAS_API_KEY pendente" sumiu (checkout deve deixar de cair no fallback "combine o pagamento com a loja"). Nenhum teste de checkout ao vivo foi feito ainda após esse redeploy.
- **2026-08-10 (revisão de workflow via brainstorm):** Leitura do código real de disputas em `origin/master` (não só o texto deste PRD) encontrou um bug de desenho: os status `em_atendimento_loja` e `aguardando_confirmacao_comprador` existiam no schema (0104) e até eram citados no guard de RLS de `0110`, mas nenhuma action de código jamais os atribuía. `marcarResolvidaPelaLoja` ia direto para `resolvida_pela_loja` sem confirmação do comprador, e `escalarParaAdmin` bloqueava escalonamento quando o status já era `resolvida_pela_loja` — ou seja, se a loja marcasse resolvida e o comprador discordasse, não havia nenhum caminho de código para ele escalar. Registrado primeiro em `openspec/specs/pos-venda-disputas/spec.md` (seção "Bug confirmado por leitura de código") antes de virar decisão de produto.
- **2026-08-10:** Corrigido o loop travado acima. Decisão de produto (recomendação da IA, aceita pelo dono do produto): a loja passa a **propor** resolução (`aguardando_confirmacao_comprador`, US02), nunca fechar sozinha; o comprador **confirma** (US06, `resolvida_pela_loja`) ou **recusa** (US03, escala direto para `em_mediacao_admin`, sem trava de tempo). Se o comprador não reagir, a disputa não fecha automaticamente a favor da loja — fica pendente indefinidamente, com um lembrete de UI após 3 dias (não uma trava de negócio). Motivo de não fechar a favor da loja por omissão: a plataforma lida com dinheiro de terceiro, e "silêncio = derrota do comprador" seria uma escolha de produto ruim para uma decisão financeira. Implementado na migration `0115_disputas_workflow_mediacao.sql`.
- **2026-08-10:** Definido SLA de 24h para o admin atuar numa disputa escalada (antes "não definido nesta versão", ver riscos §7). Estourar o prazo não dispara nenhuma ação automática nesta versão — só marca a disputa como "Atrasada" na fila do admin, para priorização visual. Revisitar com alerta/escalonamento interno se o volume de casos atrasados justificar.
- **2026-08-10:** Decidido que, a partir da escalada para mediação, o admin passa a ter **dois canais de comunicação privados e separados** — admin↔comprador e admin↔loja — implementados numa tabela nova (`disputa_mensagens_mediacao`) em vez de reaproveitar `conversas`/`mensagens`. Motivo técnico registrado: o schema de `conversas` amarra comprador_id+loja_id na mesma linha por design (`eh_participante_conversa()` sempre libera os dois), então não dá para reaproveitá-lo sem vazar a mediação para o lado que não deveria ver. Motivo de produto: evita que o admin precise arbitrar sabendo que qualquer mensagem sua é lida pelas duas partes, o que inibiria negociação franca com cada lado.
- **2026-08-10:** Encontrada duplicidade de arquivo: existe uma segunda cópia deste PRD em `web/docs/prds/009-pos-venda-disputas.md` (diretório dentro do código, plural "prds"), divergente desta versão em `docs/prd/` (singular, fora de `web/`). Esta revisão editou só a versão em `docs/prd/`, que é a referenciada por `openspec/specs/` e a que esta sessão vinha usando como fonte — a duplicidade fica registrada aqui para o dono do produto decidir qual arquivo é a fonte de verdade e remover/sincronizar a outra.
- **2026-08-10 (deploy + teste ao vivo em produção):** PR #261 mergeado em `master`, migration `0115` aplicada em produção (projeto `tiwdqgyeyvceaiqqwitc`) e validada previamente em `begin/rollback` com RLS real exercitada (`set local role authenticated`, não só `set_config` de JWT — a conexão do CLI tem BYPASSRLS e ignora RLS pura sem essa troca de role; achado de metodologia registrado para reuso em testes futuros). Fluxo completo testado ao vivo com dado real: comprador comprou produto real via checkout, disputa aberta pela UI, loja propôs resolução pela UI (`aguardando_confirmacao_comprador` confirmado), comprador recusou e escalou **imediatamente, sem trava de tempo** (`em_mediacao_admin`) — validando ao vivo a correção do bug original. Canal privado do comprador testado (mensagem enviada, não visível no canal da loja). Verificação completa do lado admin (duas threads visíveis lado a lado, decisão de arbitragem) não foi concluída nesta rodada — instabilidade do browser de automação (múltiplas abas do mesmo domínio abertas concorrentemente pelo dono do produto, cookies de sessão compartilhados no mesmo perfil Chrome) impediu terminar o clique manual; RLS do lado admin foi confirmada separadamente por query direta (`disputas_admin_all` retornando a disputa para o `user_id` admin). Feedback do dono do produto durante o teste: mensagens de mediação precisam suportar foto — registrado como gap acima (US04).
