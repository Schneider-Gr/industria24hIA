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
- Loja responde via mensagens na mesma conversa vinculada à disputa; pode propor solução (reembolso, troca, reenvio) registrando a proposta como parte do histórico.
- Loja tem 48h (§2) a partir da abertura para dar a primeira resposta; passado esse prazo, o comprador pode escalar mesmo sem resposta.
- Loja pode marcar a disputa como "resolvida" quando o comprador confirmar aceite da solução proposta.

**Edge cases:**
- Loja responde após o prazo de 48h, mas antes do comprador escalar → resposta é aceita normalmente, disputa segue em atendimento.
- Loja marca como resolvida, mas comprador não confirma em X dias *(premissa: 3 dias)* → disputa permanece "aguardando confirmação do comprador"; se não houver interação, sistema não fecha automaticamente, fica pendente para o comprador decidir (fechar ou escalar).

### US03: Comprador escalar disputa para mediação do admin

Como comprador, quero escalar minha disputa para a Indústria24h quando a loja não responde ou não concordo com a resposta, para ter uma decisão imparcial sobre o caso.

**Rules:**
- Escalonamento só é permitido após o SLA de 48h da loja ter expirado sem resposta, ou após a loja ter respondido e o comprador explicitamente recusar a proposta.
- Ao escalar, a disputa muda de status para "em mediação admin" e entra na fila de arbitragem do painel admin.
- Loja é notificada por e-mail do escalonamento.

**Edge cases:**
- Comprador tenta escalar antes do SLA de 48h vencer e sem resposta da loja → bloqueado até o SLA vencer.
- Loja responde exatamente durante o processo de escalonamento (race condition) → resposta da loja fica registrada no histórico, mas a disputa segue escalada (comprador já iniciou o processo).

### US04: Admin arbitrar disputa escalada

Como admin (mediador), quero visualizar o histórico completo de uma disputa escalada, solicitar informações adicionais e decidir o desfecho, para resolver o caso de forma imparcial e auditável.

**Rules:**
- Fila de disputas escaladas é filtrável por status (mesmo padrão de `admin/produtos` com querystring `?status=`).
- Admin visualiza: motivo, descrição, fotos do comprador, histórico de mensagens comprador↔loja, e pode enviar mensagens próprias solicitando fotos/informações adicionais de qualquer uma das partes.
- Admin decide o desfecho: `reembolso_total`, `reembolso_parcial` (com valor), `troca`, ou `negada` — sempre com justificativa textual obrigatória.
- Decisão do admin é registrada como definitiva; não há reabertura da mesma disputa após decisão *(premissa — comprador precisaria abrir novo caso ou contato fora do fluxo, se aplicável)*.
- Decisão de reembolso cria uma pendência no processo manual de repasse/estorno existente (não dispara pagamento automaticamente).

**Edge cases:**
- Admin decide reembolso parcial com valor maior que o valor do pedido/item → bloqueado, validação de limite máximo = valor do item em disputa.
- Nenhum admin atua na disputa por X dias *(premissa: 5 dias)* → sem SLA de admin definido nesta versão; item permanece na fila até ação humana *(premissa — confirme se precisa de SLA interno de admin)*.

### US05: Comprador tirar dúvida ou iniciar disputa via bot de atendimento

Como comprador, quero falar com o bot de atendimento (site ou WhatsApp) sobre um problema no meu pedido, para ser orientado rapidamente ou ter a disputa iniciada sem precisar navegar até "Meus Pedidos".

**Rules:**
- Bot já identifica a persona "comprador" (PRD 007 US01); ao detectar intenção de pós-venda (ex.: "quero trocar", "meu pedido chegou errado", "como pedir reembolso"), passa a usar o roteiro de pós-venda em vez do genérico.
- **(implementado, spec #311)** Bot consegue listar o histórico completo de pedidos do comprador logado (sem precisar saber o número) e consultar o status de um pedido específico, incluindo se o código de retirada/entrega já foi gerado e está pendente de uso.
- Bot consegue informar o status de uma disputa já aberta do comprador (consulta à mesma base de dados de disputas) e explicar prazos (janela de abertura, SLA da loja). Se a conversa for anônima/WhatsApp sem vínculo de conta, bot orienta a acessar "Meus Pedidos" logado em vez de expor dado de pedido.
- **(implementado, spec #311, resolve a premissa original de "rascunho"):** bot coleta motivo (só do enum válido para o tipo de item) e descrição, identifica o item pelo `id` retornado na consulta de pedido, e monta um **link pré-preenchido** para a tela real de abertura (`/pedido/[id]/disputa/nova?item=&motivo=&descricao=`) — o bot nunca cria a disputa diretamente; o comprador clica e confirma com 1 clique na tela (já preenchida), que revalida motivo/item no servidor antes de aceitar. O link usa o UUID interno do pedido, nunca o código legível (`id_venda`) exibido ao comprador — são valores diferentes e só o interno funciona na rota (achado de QA ao vivo, corrigido).
- Antes de montar o link, o bot verifica se já existe disputa aberta para aquele pedido (evita duplicidade), usando a mesma tool de consulta de disputas.
- Fotos nunca são anexadas pelo bot — sempre feito pelo comprador na tela de abertura.
- Handoff para humano segue o critério já validado no PRD 007 (2 tentativas sem resolver, ou pedido explícito) — para pós-venda, "humano" significa a mesma via já existente: loja (se disputa ainda não escalada) ou fila de mediação do admin (se já escalada), não um lead genérico de CRM.
- **(implementado, spec #311)** Todo escalonamento também cria um ticket rastreável em `incidentes_atendimento` (visível em `/admin/incidentes`), independente do Jira responder — ver PRD 001 US07 para o detalhe (o registro no admin nasce antes da tentativa de Jira).

**Edge cases:**
- Comprador pede reembolso ao bot para pedido fora da janela de abertura (7 dias, ou 24h se perecível) → bot informa o prazo expirado com a mesma mensagem da UI, não finge que vai processar.
- Comprador tenta usar o bot para pular a resposta da loja e ir direto para o admin → bot aplica a mesma regra de SLA de 48h antes de permitir escalonamento (não é uma via de bypass).
- Conversa via WhatsApp sem conta vinculada → bot não consegue abrir disputa formal (exige comprador autenticado); orienta a acessar "Meus Pedidos" pelo site logado.
- Item informado não pertence ao pedido, ou pedido/item não existe → tela de abertura retorna 404, nada é criado (validado no servidor, não confia só no que o bot montou).
- Motivo sugerido pelo bot incompatível com o tipo de item (ex.: motivo de perecível num item comum) → tela ignora o valor e não pré-seleciona nada.
- **Achado real em QA ao vivo (19/08/2026), corrigido:** quando a persona do comprador ainda não era conhecida no início da conversa e a mesma mensagem já trazia o pedido de troca, o bot precisava de 2 rodadas de chamada de ferramenta (1ª: identificar persona; 2ª: tools de pós-venda, que só aparecem no prompt depois que a persona muda) — o loop de tool-calling tinha teto de 1 rodada e a conversa caía em "Não consegui gerar uma resposta agora". Corrigido elevando o teto para 3 rodadas (PR #321).

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
   ├── Loja responde e resolve, comprador confirma ──▶ Disputa "resolvida pela loja"
   │
   ├── Loja responde, comprador discorda ──▶ Comprador pode escalar
   │
   └── Loja não responde em 48h ──▶ Comprador pode escalar
                                          │
                                          ▼
                              Caso cai na fila de mediação (admin)
                                          │
                                          ▼
                        Admin revisa histórico, pode pedir fotos extras
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
| Comprador não consegue escalar antes do SLA de 48h sem resposta da loja | Garante que a loja teve chance real de resolver antes de virar caso para o admin | Tentar escalar disputa recém-aberta e verificar bloqueio |
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

**Funcionalidades:** US00, US01, US02

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [x] Comprador autenticado acessa `/meus-pedidos` e vê a lista de todos os seus pedidos, ordenados do mais recente *(verificado ao vivo em produção, 05/08/2026)*
- [x] Links de "Meus Pedidos" no menu mobile e no footer da vitrine deixam de apontar para "em breve"/`/login` e passam a levar à lista real *(verificado ao vivo)*
- [ ] Loja recebe e-mail de notificação em até 5 minutos da abertura da disputa *(não confirmado — sem verificação de caixa de entrada real nesta rodada)*
- [x] Comprador consegue abrir disputa com motivo, descrição e fotos a partir do botão "Trocar ou pedir ajuda" (lista e detalhe do pedido) *(verificado ao vivo, disputa real criada e foto anexada)*
- [x] Loja consegue responder à disputa via chat *(verificado ao vivo — mensagem enviada e persistida)*; marcar como resolvida tem o botão implementado mas não foi clicado nesta rodada de teste

**Aprovador:** Dono do produto (Indústria24h)

### Milestone 2: Mediação da Indústria24h

**Por que é um marco:** fecha o fluxo de ponta a ponta — comprador tem garantia de que, se a loja não resolver, alguém arbitra. É a peça que dá confiança ao comprador para comprar sabendo que há recurso.

**Funcionalidades:** US03, US04

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Comprador não consegue escalar antes do SLA de 48h sem resposta da loja *(lógica coberta por teste unitário; não testado ao vivo — rate-limit de login interrompeu o teste)*
- [x] Admin visualiza fila de disputas escaladas filtrável por status *(verificado ao vivo em produção, 05/08/2026 — `/admin/disputas` listou disputa real em `em_mediacao_admin`)*
- [x] Admin não consegue registrar reembolso parcial acima do valor do item em disputa *(verificado ao vivo — tentativa de R$100 num item de R$45 foi bloqueada, confirmado por query direta no banco: nenhuma decisão gravada)*
- [ ] Toda decisão de admin exige justificativa textual não vazia *(coberta por validação de código; não exercitada ao vivo)*
- [ ] Decisão de reembolso cria pendência visível no fluxo manual de repasse existente *(depende de decisão válida ser registrada — não concluído nesta rodada, ver nota abaixo)*

**Aprovador:** Dono do produto (Indústria24h)

### Milestone 3: Bot de atendimento orienta e inicia disputas

**Por que é um marco:** reduz o atrito de reportar um problema — comprador não precisa necessariamente navegar até "Meus Pedidos"; pode resolver a dúvida ou já iniciar a disputa numa conversa que talvez já estivesse tendo por outro motivo (site ou WhatsApp).

**Funcionalidades:** US05

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [x] Bot reconhece intenção de pós-venda e usa o roteiro específico em vez do genérico *(verificado ao vivo em produção, 19/08/2026)*
- [ ] Bot informa prazo expirado corretamente (7 dias padrão ou 24h se item perecível) sem fingir que vai processar um pedido fora da janela *(não exercitado nesta rodada de QA — coberto pela mesma validação de servidor da tela de disputa, não testado especificamente pelo bot)*
- [ ] Bot não permite escalonamento para admin antes do SLA de 48h da loja vencer *(não exercitado nesta rodada de QA)*
- [x] Handoff do bot para humano direciona à via correta e cria ticket rastreável (`incidentes_atendimento` + Jira) *(verificado ao vivo — incidente com `jira_issue_key` KAN-106/KAN-107 confirmado no banco e na tela `/admin/incidentes`)*
- [x] Bot nunca registra a disputa diretamente — monta link pré-preenchido, abertura formal exige confirmação explícita do comprador na tela de US01 *(verificado ao vivo — motivo e descrição pré-preenchidos corretos na tela real, link usa UUID interno após correção de bug)*
- [x] Bot lista histórico completo de pedidos quando a pessoa não sabe/informa o número *(verificado ao vivo — spec #311 US01, adicional a este PRD)*

**Aprovador:** Dono do produto (Indústria24h)

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| Volume de disputas escaladas sobrecarrega a fila do admin sem SLA interno definido | Médio | Definir SLA de admin em iteração futura se o volume justificar (ver US04 edge case) | Pendente |
| Reembolso decidido pelo admin sem automação pode gerar atraso na execução financeira | Médio | Pendência deve ser visível/priorizável no painel de repasse existente | Pendente |
| Ambiente de Preview da Vercel não tem `SUPABASE_SERVICE_ROLE_KEY`/`OPENAI_API_KEY`, então o bot (US05) não funciona em PRs — só é possível testar direto em produção após merge | Médio — retarda o ciclo de QA e implica testar mudanças de bot já em produção | Aceito nesta rodada (mudanças pequenas, com hotfix rápido quando achado bug); considerar configurar env de Preview se o volume de mudanças no bot aumentar | Monitorando |
| Ticket de escalonamento (US05, spec #311) dependia só do Jira, que já teve token expirado/rotacionado no passado sem nenhuma UI mostrando isso | Alto — chamado se perdia silenciosamente | Registro próprio em `incidentes_atendimento`, criado antes da tentativa de Jira (não depende dela) | Resolvido |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| Infraestrutura de chat comprador↔vendedor (`conversas`/`mensagens`, PR #88) | Interna | Em produção | Sem ela, seria necessário criar chat paralelo — fora do escopo desejado |
| Fluxo manual de repasse/estorno (PR #110) | Interna | Em produção | Reembolso decidido na disputa ficaria sem via de execução financeira |
| Bot de atendimento multi-persona (PRD 007) | Interna | Rascunho | US05 depende do roteamento por persona e do critério de handoff já especificados no PRD 007; sem ele, US05 não teria onde se apoiar |
| Termos e regras de item perecível (PRD 010) | Interna | Rascunho | US01/US05 aplicam janela de 24h e foto obrigatória a item perecível apenas se o PRD 010 estiver implementado; sem ele, todo pedido segue a regra padrão de 7 dias |

## 8. Referências

- [Painel Pós-venda do Mercado Livre](https://www.mercadolivre.com.br/post-purchase/post-sales) — referência de UX: abas Reclamações e mediações / Mensagens / Devoluções.
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
- [Issue #311](https://github.com/Schneider-Gr/industria24hIA/issues/311) / PRs [#316](https://github.com/Schneider-Gr/industria24hIA/pull/316), [#317](https://github.com/Schneider-Gr/industria24hIA/pull/317), [#318](https://github.com/Schneider-Gr/industria24hIA/pull/318), [#320](https://github.com/Schneider-Gr/industria24hIA/pull/320), [#321](https://github.com/Schneider-Gr/industria24hIA/pull/321) — implementação da US05 (bot pós-venda) e da US07 do PRD 001 (tickets)
- `docs/prds/020-bot-atendimento.md` (renumerado de `docs/prd/web-001-bot-atendimento.md` em 19/08/2026) — PRD complementar do bot; US06/US07 lá cobrem o lado "bot" desta mesma integração

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
- **2026-08-19 (spec #311):** US05 saiu de "rascunho de disputa" para "link pré-preenchido, confirmação com 1 clique" — decisão tomada no brainstorm de origem: manter a barreira humana já registrada em 05/08/2026 (bot nunca cria disputa), mas eliminar a redigitação de motivo/descrição/item que a pessoa já deu na conversa. 2 bugs reais achados e corrigidos em QA ao vivo (link usando `id_venda` em vez do UUID interno; loop de tool-calling limitado a 1 rodada) — ambos documentados como Riscos/Edge cases acima em vez de ficarem só no histórico do PR.
- **2026-08-19:** ticket de escalonamento (parte da US05) ganhou registro próprio (`incidentes_atendimento`, PRD 001 US07) por decisão explícita de não depender só do Jira — `jira_issue_key` nunca tinha sido lido em nenhuma UI antes, e o token do Jira já rotacionou/expirou sem aviso no passado.
## 10. Anexo histórico — correção de workflow e mediação (10/08/2026)

> Absorvido de `docs/prd/pos-venda-disputas-workflow-mediacao.md` em 19/08/2026 (consolidação da numeração de PRDs — esse documento vivia solto em `docs/prd/`, fora do índice do README, cobrindo o mesmo módulo deste PRD 009 sem frontmatter nem numeração própria). Conteúdo original preservado abaixo.

Escrito na sessão de 10/08/2026 a partir de revisão de código real + brainstorm de workflow — não é export do Confluence.

**Objetivo:** corrigir um bug de desenho no fluxo de pós-venda/disputas (`seller-posvenda`): a loja podia marcar uma disputa como "resolvida" diretamente, sem confirmação do comprador, e se o comprador discordasse não havia nenhum caminho de código para ele escalar para mediação — a disputa ficava travada permanentemente. Corrigido junto com a introdução de um canal de mediação privado e separado por lado (admin↔comprador, admin↔loja), que antes não existia.

**Problema:** o sistema de disputas previa nos status (`em_atendimento_loja`, `aguardando_confirmacao_comprador`) e no guard de RLS um fluxo de confirmação do comprador, mas nenhuma action de código jamais atribuía esses status. `marcarResolvidaPelaLoja` ia direto para `resolvida_pela_loja`; `escalarParaAdmin` bloqueava explicitamente o escalonamento quando o status já era `resolvida_pela_loja`. Resultado: se a loja marcasse resolvida e o comprador discordasse da solução, ele ficava sem recurso. Além disso, quando uma disputa chegava à mediação do admin, ele só lia o histórico público comprador↔loja — não tinha canal próprio para conversar com cada lado sem que o outro visse.

**Requisitos implementados:**

| Requirement | Importance |
|---|---|
| Loja propõe resolução (`aguardando_confirmacao_comprador`), nunca fecha a disputa sozinha | HIGH |
| Comprador confirma (fecha) ou recusa (escala) a qualquer momento após a proposta, sem trava de tempo | HIGH |
| Se o comprador nunca reagir, a disputa não fecha automaticamente a favor da loja | HIGH |
| Admin tem canal de mensagens privado e separado por lado (comprador, loja) durante a mediação, em tabela própria (`disputa_mensagens_mediacao`), sem reaproveitar o chat público comprador↔loja | HIGH |
| Admin tem SLA de 24h desde o escalonamento; estourar só marca "Atrasada" na fila, sem ação automática | MEDIUM |
| RLS (`guard_campos_restritos`) impede a loja de contornar a UI e mudar o status direto para `resolvida_pela_loja` | HIGH |

**Fora do escopo (nesta correção):** alerta/escalonamento interno automático quando o SLA de 24h do admin vence (só o indicador visual "Atrasada"); reabertura de disputa já decidida pelo admin; disputas de entregas por afiliado logístico e de pedidos de venda futura/compra coletiva.

**Decisão de produto:** a loja nunca fecha uma disputa sozinha; quem decide o desfecho é sempre o comprador (confirmar ou recusar) — mesmo que ele nunca reaja, o sistema não fecha automaticamente a favor da loja. Motivo: a plataforma lida com dinheiro de terceiro, e "silêncio do comprador = derrota" seria uma escolha de produto ruim para uma decisão financeira. Decisão tomada em brainstorm de revisão de workflow, 10/08/2026, aceita pelo dono do produto.

**Atualização 11/08/2026 — anexo de foto entregue:** o gap "sem anexo de foto no canal de mediação" (feedback do dono do produto em teste ao vivo) foi resolvido: migration `0116_disputa_mediacao_anexo_foto.sql` adiciona `foto_url` a `disputa_mensagens_mediacao` e policies de storage no bucket `disputas` (prefixo `mediacao/{disputa_id}/{destinatario}/...`), mantendo o mesmo isolamento por lado (comprador só vê o canal `comprador`, loja só vê o canal `loja`, admin vê ambos) já usado para o texto.

**Referências do anexo:**
- Migration `0115_disputas_workflow_mediacao.sql` — implementação da correção e da tabela de mediação.
- Migration `0116_disputa_mediacao_anexo_foto.sql` — anexo de foto no canal de mediação.
- PR #261 — código mergeado em `master`, testado ao vivo em produção com dado real (compra → disputa → proposta → recusa → mediação com canais separados, confirmado ponta a ponta).
- `openspec/specs/seller-posvenda/spec.md` e `openspec/specs/admin-disputas/spec.md` — specs formais atualizadas/criadas junto com este anexo.

## 11. Registro de Decisões (continuação)

- **2026-08-06 (RESOLVIDO):** Causa raiz do checkout preso em "pendente" não era conteúdo/encoding da chave — era **mismatch de nome de env var** entre código e Vercel. Um commit paralelo (#236, `27d3328`) já mesclado em `master` havia trocado o código para ler `ASAAS_API_KEY2`, mas essa env nunca chegou a ser criada na Vercel; a variável Sensitive que de fato existia (criada minutos antes) se chamava `ASASS_API_KEY` (typo herdado do incidente de 05/08, registrado acima, nunca corrigido). Decisão do dono do produto: manter `ASASS_API_KEY` como nome definitivo em vez de corrigir o typo na Vercel. `src/lib/asaas.ts` foi atualizado para ler esse nome (commit `94e68de`, push direto em `master`, deploy `dpl_2yLBf1LDBAFY3puYjiZE3DduV1N7` com alias em `industria24.com.br`). Validado ao vivo: compra real (conta `andreiaschneider+i24hmvp@gmail.com`, loja Viva Ecologica, "Alface crespa Viva Baby", 10un) gerou fatura Asaas sandbox real — pedido `266C6BFFE5`, R$5,10, status "Aguardando Pagamento", link de pagamento PIX funcional. `isAsaasConfigured` agora retorna `true` em produção. Pendência que permanece: `ASAAS_ENV=production` continua não configurada (ver Referências), então o checkout ainda opera em sandbox mesmo com essa correção — trocar para chave/ambiente de produção real é decisão separada do dono do produto.
