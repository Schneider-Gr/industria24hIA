---
prd_number: "005"
status: rascunho
priority: média
created: 2026-07-30
issue: ""
depends_on: []
references:
  - "src/app/api/carrinho/sync/route.ts — endpoint de sync do carrinho"
  - "src/app/api/carrinho/abandono/tick/route.ts — varredura e disparo"
  - "src/lib/email.ts — envio via Resend"
  - "src/lib/whatsapp.ts — envio via Meta Cloud API"
  - "supabase/migrations/0094_carrinhos_abandonados.sql — schema"
  - "vercel.json — agendamento do cron"
---

# PRD 005: Carrinho Abandonado

## 1. Contexto

- **Produto/área**: Vitrine / conversão de compra do industria24.com.br.
- **Estado atual**: o carrinho vive só em `localStorage` no navegador do
  comprador (`src/components/carrinho/carrinho.tsx`). O backend não tem
  nenhuma visibilidade sobre quem colocou item no carrinho e não voltou —
  não existe lembrete, cupom ou qualquer contato depois que o usuário sai
  da página sem finalizar a compra.
- **Problema**: intenção de compra capturada (item no carrinho) e perdida
  sem nenhuma tentativa de recuperação. Em e-commerce esse é um dos
  maiores buracos de conversão barato de fechar — o comprador já decidiu o
  que quer, só não terminou.

> **Contexto técnico** (stack, arquitetura, padrões) vive no TRD
> (`docs/trd.md`). Aqui: o carrinho passa a ter um espelho server-side
> (tabela `carrinhos_abandonados`, sync debounced do client), e um job
> horário (Vercel Cron) varre quem está parado e dispara o lembrete.

## 2. Solução Proposta

### Visão de produto

- Todo carrinho de comprador **logado** ganha um espelho no servidor,
  atualizado a cada mudança de item — sem isso não existe como o backend
  saber que alguém abandonou algo.
- Carrinho parado por 1h sem finalizar a compra dispara **um** lembrete
  por e-mail com a lista exata dos itens deixados e um link direto de
  volta ao carrinho.
- WhatsApp fica de fora nesta primeira fase — a lib existente
  (`src/lib/whatsapp.ts`) só envia texto livre dentro da janela de 24h de
  conversa ativa; fora dela (o caso normal de quem some do site) exige
  template pré-aprovado pela Meta, que não existe hoje *(premissa —
  confirme ou corrija; ver US03 para o desenho de quando isso mudar)*.
- Se o carrinho mudar de novo (o comprador voltou e mexeu) ou o pedido for
  concluído, o rastro é zerado/apagado — nunca manda lembrete de um
  carrinho que já não existe mais daquele jeito.

### Decisões de produto

1. **Prazo de abandono: 1h sem atualização.** Curto o bastante para pegar
   intenção de compra ainda quente, sem soar imediato/invasivo.
2. **Canal desta fase: e-mail apenas.** WhatsApp exige investimento
   separado (template aprovado) fora do escopo desta entrega.
3. **Um lembrete por "episódio" de abandono.** Não é lembrete recorrente
   — se mandou uma vez e o comprador não voltou, para por aí. Evita
   parecer spam.
4. **Só usuário logado.** Carrinho anônimo não tem e-mail para contatar;
   não há como recuperar visitante não identificado nesta fase.

> Nenhuma decisão arquitetural durável nova aqui (a escolha de reusar
> Resend/Meta Cloud API e Vercel Cron já é convenção existente do
> projeto, não uma decisão nova de PRD).

### Fora do escopo

- Envio por WhatsApp nesta fase — depende de template aprovado pela Meta
  *(premissa — confirme ou corrija)*.
- Cupom de desconto ou incentivo financeiro no lembrete — só recuperação
  informativa por ora *(premissa — confirme ou corrija)*.
- Sequência de múltiplos lembretes (2º, 3º contato) — só um disparo por
  abandono *(premissa — confirme ou corrija)*.
- Carrinho de visitante não autenticado — sem e-mail, sem como contatar.
- Painel/relatório de métricas de recuperação para o admin — fica para
  uma iteração futura se a taxa de recuperação justificar.

## 3. Funcionalidades

### US01: Sincronizar carrinho no servidor

Como comprador logado, quero que meu carrinho seja espelhado no servidor
enquanto eu monto ele, para que o sistema consiga me lembrar caso eu saia
sem finalizar.

**Rules:**
- Toda alteração no carrinho (adicionar item, mudar quantidade, remover)
  dispara sincronização com o servidor, com debounce de 1,5s para não
  gerar uma chamada por clique.
- Sincronizar só acontece com sessão ativa — carrinho de visitante
  anônimo não sai do `localStorage`.
- Qualquer mudança no carrinho reseta o estado de "lembrete já enviado" —
  um carrinho que voltou a ser mexido volta a ser elegível a um novo
  lembrete se abandonar de novo.

**Edge cases:**
- Falha de rede no momento do sync → silenciosa; a compra no client não é
  bloqueada, só o rastro server-side fica desatualizado até a próxima
  tentativa.
- Usuário desloga com itens no carrinho → o carrinho anônimo continua no
  `localStorage`; o espelho server-side do login anterior permanece como
  estava até vencer o prazo normal de abandono.

### US02: Disparar lembrete por e-mail de carrinho abandonado

Como comprador que deixou itens no carrinho, quero receber um e-mail me
lembrando do que deixei pra trás, para que eu volte e finalize a compra.

**Rules:**
- Um job horário varre carrinhos com mais de 1h sem atualização e sem
  lembrete ainda enviado.
- O e-mail lista os itens exatos do carrinho (nome + quantidade) e um
  link direto para `/carrinho`.
- Após o envio confirmado, o carrinho é marcado como "lembrete enviado" —
  não dispara de novo para o mesmo episódio de abandono.
- Carrinho esvaziado (0 itens) nunca entra na varredura.
- Envio usa o remetente e provedor transacional já configurados no
  projeto (Resend) — sem template de marketing separado nesta fase.

**Edge cases:**
- Envio falha no provedor (Resend fora do ar, chave ausente) → o
  carrinho **não** é marcado como notificado; entra de novo na próxima
  varredura horária.
- Comprador finaliza a compra entre a varredura e o envio → best-effort:
  pode receber um lembrete de um carrinho que acabou de virar pedido;
  aceitável, sem tentativa de cancelamento em voo *(premissa — confirme
  ou corrija)*.
- E-mail do usuário vazio/inválido no momento do sync → carrinho não
  entra na varredura (sem destino de envio).

### US03: Disparar lembrete por WhatsApp *(fora do escopo desta entrega — desenho de referência)*

Como comprador que deixou itens no carrinho, quero também poder receber o
lembrete por WhatsApp, para que a chance de eu ver o aviso seja maior.

**Rules:**
- Só pode ser ativado depois de existir um **template de mensagem
  aprovado pela Meta** para o caso de uso "carrinho abandonado" — a Meta
  Cloud API não permite texto livre fora da janela de 24h de conversa
  ativa, que é o cenário normal de quem abandonou o carrinho e sumiu do
  site *(premissa — confirme ou corrija: prazo/processo de aprovação do
  template com a Meta fica a cargo de quem for executar esta US)*.
- Quando ativado, dispara **junto** com o e-mail no mesmo job de
  varredura (mesmo gatilho de 1h, mesmo evento de "lembrete enviado") —
  não um segundo canal com timing próprio, para não dobrar a cadência de
  contato *(premissa — confirme ou corrija)*.
- Só dispara para quem tem telefone com WhatsApp válido cadastrado
  (mesmo dado de contato já usado no fluxo de pedido/retirada,
  `pedido_registrar_contato`) — sem telefone, só e-mail.

**Edge cases:**
- Telefone cadastrado mas fora da janela de 24h e sem template aprovado
  ainda → não envia (silencioso), cai só no e-mail.
- Template aprovado mas API do WhatsApp fora do ar no momento do disparo
  → mesmo tratamento do e-mail: não marca como notificado, tenta de novo
  na próxima varredura.

## 4. Fluxo de Negócio

```
Item adicionado/alterado no carrinho (usuário logado)
   │
   ▼
Sync server-side (debounced) grava itens + zera "lembrete enviado"
   │
   ▼
Job horário varre: carrinho parado há > 1h?
   ├── não ──▶ aguarda próxima varredura
   └── sim ──▶ já tem lembrete enviado para este episódio?
                 ├── sim ──▶ ignora
                 └── não ──▶ tem e-mail? ──▶ envia e-mail
                                          └──▶ [Fase 2] tem WhatsApp + template aprovado? ──▶ envia WhatsApp
                              │
                              ▼
                     marca "lembrete enviado"

Pedido finalizado ──▶ apaga o espelho do carrinho (nunca mais varre)
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| Carrinho de usuário logado aparece espelhado no servidor em até ~2s após a última alteração | Sem o espelho atualizado, o job varre estado desatualizado e manda lembrete errado ou atrasado | Alterar carrinho, consultar `carrinhos_abandonados` pelo `user_id` e conferir os itens |
| Lembrete só é enviado depois de 1h sem atualização | Enviar antes soa invasivo; é a decisão de produto (§2) | Criar carrinho de teste, rodar o tick antes de 1h (não envia) e depois de 1h (envia) |
| Mesmo episódio de abandono nunca gera 2 e-mails | Evita parecer spam (§2, decisão 3) | Rodar o tick duas vezes seguidas sobre o mesmo carrinho parado; só o 1º envia |
| Pedido concluído remove o carrinho da varredura | Comprador que já comprou não pode receber lembrete do que já pagou | Finalizar um pedido de teste e confirmar que a linha em `carrinhos_abandonados` some |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| Taxa de recuperação (pedido concluído em até 24h após o lembrete / total de lembretes enviados) | A levantar — sem histórico hoje, feature nova | 5% | 30 dias após ativação em produção | 2% | Dono do produto |

## 6. Milestones

### Milestone 1: Recuperar carrinho abandonado por e-mail

**Por que é um marco:** primeira vez que o backend enxerga carrinho
abandonado e age sobre ele — fecha o buraco de conversão sem depender de
nenhuma aprovação externa (Meta/template).

**Funcionalidades:** US01, US02

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Carrinho de usuário logado aparece espelhado no servidor em até ~2s após a última alteração
- [ ] Lembrete só é enviado depois de 1h sem atualização
- [ ] Mesmo episódio de abandono nunca gera 2 e-mails
- [ ] Pedido concluído remove o carrinho da varredura

**Aprovador:** Dono do produto

### Milestone 2: Recuperar carrinho abandonado também por WhatsApp

**Por que é um marco:** segundo canal de contato, ativado só quando a
pré-condição externa (template aprovado pela Meta) existir — amplia
alcance sem re-desenhar o gatilho de 1h já validado no Milestone 1.

**Funcionalidades:** US03

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Template de "carrinho abandonado" aprovado pela Meta
- [ ] Lembrete por WhatsApp dispara junto com o e-mail, no mesmo evento de varredura
- [ ] Comprador sem telefone cadastrado continua recebendo só o e-mail, sem erro

**Aprovador:** Dono do produto

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| Volume de e-mail transacional sobe e esbarra em limite/reputação do Resend | Médio | Monitorar taxa de envio e bounce; revisar plano do Resend se necessário | Pendente |
| Template de WhatsApp reprovado ou demorado na Meta | Médio | Milestone 2 fica bloqueado até aprovação; Milestone 1 já entrega valor sozinho | Pendente |
| Lembrete chega depois que o comprador já desistiu de vez (percepção de spam) | Baixo | Um único disparo por episódio (decisão 3); revisar prazo de 1h se taxa de opt-out/reclamação subir | Monitorando |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| `CRON_SECRET` configurada no projeto Vercel | Interna | Pendente — precisa ser criada manualmente no dashboard | Sem ela, o Vercel Cron não autentica e o Milestone 1 não dispara em produção |
| `RESEND_API_KEY` / `RESEND_FROM` configuradas | Interna | Presumidamente já configuradas (usadas por outros fluxos transacionais) *(premissa — confirme ou corrija)* | Sem chave, `enviarEmail` vira no-op e nenhum lembrete sai |
| Template de mensagem aprovado pela Meta para WhatsApp | Externa | Não iniciado | Bloqueia inteiramente o Milestone 2 |

## 8. Referências

- [src/app/api/carrinho/sync/route.ts](../../src/app/api/carrinho/sync/route.ts) — sync do carrinho, implementado
- [src/app/api/carrinho/abandono/tick/route.ts](../../src/app/api/carrinho/abandono/tick/route.ts) — varredura e disparo, implementado
- [src/lib/whatsapp.ts](../../src/lib/whatsapp.ts) — limite da janela de 24h documentado no próprio arquivo, base da US03
- [supabase/migrations/0094_carrinhos_abandonados.sql](../../supabase/migrations/0094_carrinhos_abandonados.sql) — schema já escrito, pendente de aplicar em produção

## 9. Registro de Decisões

- **2026-07-30:** prazo de abandono definido em 1h. Motivo: decisão do
  dono do produto, equilíbrio entre capturar intenção quente e não soar
  imediato.
- **2026-07-30:** canal desta entrega restrito a e-mail, WhatsApp adiado
  para Milestone 2. Motivo: `src/lib/whatsapp.ts` só entrega texto livre
  dentro da janela de 24h de conversa ativa; fora dela precisa de
  template aprovado pela Meta, que não existe hoje — travar o Milestone 1
  nisso adiaria toda a entrega sem necessidade.
- **2026-07-30:** um único lembrete por episódio de abandono, sem
  sequência de reenvios. Motivo: decisão do dono do produto, evitar
  percepção de spam antes de ter dado de recuperação real para justificar
  cadência maior.
