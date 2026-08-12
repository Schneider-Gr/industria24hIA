---
prd_number: "007"
status: rascunho
priority: média
created: 2026-08-10
issue: ""
depends_on: []
references:
  - "supabase/migrations/0040_parceiro_logistico_rpcs.sql — RPCs publicar_leilao_fabricante, dar_lance_leilao, adjudicar_leilao"
  - "src/lib/agentes/coletiva-etapas.ts — padrão de agente StateGraph já em produção (compra coletiva), reaproveitado nesta feature"
---

# PRD 007: Acompanhamento Automático do Leilão Reverso entre Fabricantes

## 1. Contexto

- **Produto/área**: Leilão reverso entre fabricantes (`/leilao`), módulo do marketplace industria24h onde um comprador publica uma demanda e lojas dão lances de preço/prazo para atendê-la.
- **Estado atual**: publicação, lance e adjudicação existem como ações manuais (`publicarLeilao`, `darLanceLeilao`, `adjudicarLeilao` em `src/app/leilao/actions.ts`). Não existe nenhuma rotina que rode sozinha: se o comprador não voltar à página, um leilão com `janela_fim` vencida fica parado em `status='Aberto'` indefinidamente, mesmo tendo lances recebidos; e ninguém é avisado que o prazo está próximo do fim.
- **Problema**: comprador perde a melhor oferta por não voltar a olhar a página a tempo, e lojista que deu lance não sabe se ainda vale a pena aguardar. Sem um lembrete ativo, o leilão reverso depende de o comprador lembrar de checar manualmente — o que reduz a taxa de adjudicação e a atratividade do recurso para quem dá lance.

> **Contexto técnico** (stack, arquitetura, padrões) vive no TRD (`docs/trd.md`) e no padrão já existente em `src/lib/agentes/coletiva-etapas.ts`, carregados na implementação. Aqui só o ponteiro: esta feature replica, para o leilão, o mesmo tipo de rotina periódica que já roda para compra coletiva.

## 2. Solução Proposta

### Visão de produto

- Um lembrete automático avisa o comprador quando o leilão está a poucas horas de fechar e já existe pelo menos um lance recebido, destacando o melhor lance até o momento.
- Quando a janela do leilão vence, o comprador recebe um aviso final resumindo os lances recebidos (ou a ausência deles) e um lembrete de que a adjudicação continua sendo uma ação manual dele.
- O lojista que deu lance recebe aviso quando o leilão para o qual ele deu lance é adjudicado (para outro lance) ou vence sem adjudicação — hoje ele só descobre voltando à página. *(premissa — confirme ou corrija: pode ser que vocês queiram restringir o aviso ao vencedor apenas, por custo/ruído de notificação)*
- O sistema nunca decide sozinho quem vence o leilão — a escolha do lance continua sendo do comprador, feita manualmente na tela existente.

### Decisões de produto

1. **A adjudicação continua 100% manual.** A RPC `adjudicar_leilao` exige a sessão do próprio comprador (`comprador_id = auth.uid()`); esta feature não cria uma via de adjudicação automática. Motivo: adjudicar compromete o comprador com um fornecedor, e essa é uma decisão comercial que ele deve tomar deliberadamente, não uma etapa que corre sozinha.
2. **O lembrete de prazo dispara uma única vez por leilão**, na janela de 24h antes do fim *(premissa — confirme ou corrija: mesmo limiar de "prazo_proximo" já usado em `coletiva-etapas.ts`)*, para não gerar ruído repetido.
3. **Leilão sem nenhum lance recebido não gera lembrete de "prazo próximo"** — só o aviso final de que venceu sem lance, já que não há nada de acionável a lembrar o comprador nas 24h anteriores.
4. **Os números do aviso (preço do melhor lance, quantas horas faltam) são sempre calculados em código antes de qualquer texto gerado por IA** — a redação (se usada) só escolhe as palavras, nunca o valor, seguindo o mesmo princípio já aplicado em `coletiva-etapas.ts`.

> Decisão **arquitetural** (uso de LangGraph/StateGraph para a rotina, forma de agendamento/cron) não entra aqui — registrar como ADR (`docs/adrs/`) via `escrever-trd` Modo Decision quando esta feature entrar em execução.

### Fora do escopo

- Adjudicação automática do leilão por qualquer critério (menor preço, melhor prazo) — decisão comercial permanece manual do comprador. *(premissa — confirme ou corrija)*
- Geração de pedido automático a partir do lance vencedor — já é escopo futuro reconhecido em `adjudicar_leilao` (comentário "compra em si fecha entre as partes (v1)"), não desta feature.
- Renegociação de lance ou contraproposta após o fim da janela.
- Notificação por canal externo (e-mail, WhatsApp) nesta fase — aviso fica dentro da plataforma (mural/notificação in-app), no mesmo padrão de `coletiva_evento`. *(premissa — confirme ou corrija)*
- Reabertura automática de leilão vencido sem lance.

## 3. Funcionalidades

### US01: Aviso de prazo próximo com lance recebido

Como comprador que publicou um leilão, quero ser avisado quando o prazo está perto de vencer e já existe lance, para poder decidir a tempo em vez de perder a janela por esquecimento.

**Rules:**
- Dispara quando `janela_fim` está a 24h ou menos de vencer, o leilão segue `status='Aberto'` e existe ao menos um lance em `leilao_lances`. *(premissa — confirme ou corrija: limiar de 24h)*
- O aviso mostra o menor preço entre os lances recebidos e quantos lances existem, sem citar valores que não vieram do banco.
- Dispara uma única vez por leilão — repetir a execução da rotina não deve gerar aviso duplicado.

**Edge cases:**
- Leilão já adjudicado antes das 24h finais → não gera aviso de prazo próximo (já foi resolvido).
- Rotina não roda por um período (ex.: falha de infraestrutura) e o leilão já passou das 24h quando ela roda de novo → ainda dispara o aviso, desde que a janela não tenha vencido.

### US02: Aviso final de encerramento

Como comprador que publicou um leilão, quero ser avisado quando a janela vence, resumindo os lances recebidos, para saber que preciso agir (adjudicar manualmente) ou que o leilão terminou sem propostas.

**Rules:**
- Dispara quando `janela_fim <= now()` e o leilão ainda está `status='Aberto'` (não foi adjudicado antes do fim).
- Se há lances, o aviso lista o melhor preço e quantidade total de lances, e lembra que a adjudicação é manual.
- Se não há lances, o aviso informa que o leilão venceu sem propostas. *(premissa — confirme ou corrija: o leilão muda de status para algo como "Expirado" ou permanece "Aberto" indefinidamente aguardando ação do comprador? Requer decisão de schema/regra, não inferir)*
- Dispara uma única vez por leilão.

**Edge cases:**
- Leilão vence exatamente no instante da execução da rotina (empate de timestamp) → tratar como vencido (`janela_fim <= now()` inclusive).
- Comprador adjudica manualmente entre duas execuções da rotina, momentos antes dela rodar → rotina não deve gerar aviso de encerramento para um leilão que já não está `Aberto`.

### US03: Aviso ao lojista sobre o desfecho do próprio lance

Como lojista que deu lance em um leilão, quero ser avisado quando esse leilão é adjudicado ou vence sem decisão, para saber se ainda devo aguardar ou já posso liberar a produção/estoque reservado mentalmente para aquela proposta.

**Rules:**
- Ao adjudicar (ação manual do comprador), a loja vencedora recebe confirmação e as demais lojas que deram lance no mesmo leilão recebem aviso de que não foram escolhidas. *(premissa — confirme ou corrija: pode ser que só o vencedor deva ser avisado nesta primeira fase)*
- Se o leilão vence sem adjudicação, todas as lojas que deram lance recebem aviso de que o leilão encerrou sem decisão.

**Edge cases:**
- Loja deu mais de um lance no mesmo leilão (o `on conflict` da RPC já garante só o lance mais recente por loja) → recebe um único aviso, referente ao lance vigente.
- Loja excluiu a conta ou desativou a loja entre o lance e o desfecho → aviso não é entregue com erro fatal; rotina segue para as demais lojas. *(premissa — confirme ou corrija)*

## 4. Fluxo de Negócio

```
Rotina roda (periódica)
   │
   ▼
Leilão está Aberto?
   ├── não ──▶ ignora
   └── sim ──▶ janela_fim <= now()?
                  ├── sim ──▶ existe lance?
                  │            ├── sim ──▶ avisa comprador (resumo + lembrete de adjudicar)
                  │            │            avisa lojistas que deram lance (encerrado sem decisão)
                  │            └── não ──▶ avisa comprador (venceu sem propostas)
                  └── não ──▶ faltam ≤ 24h e existe lance e aviso ainda não disparado?
                               ├── sim ──▶ avisa comprador (prazo próximo + melhor lance)
                               └── não ──▶ ignora, tenta na próxima execução
```

Adjudicação (ação manual, fora desta rotina):
```
Comprador adjudica um lance
   │
   ▼
Loja vencedora avisada (confirmação)
Demais lojas que deram lance avisadas (não escolhidas)
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| Nenhum aviso duplicado para o mesmo leilão e mesmo tipo de evento (prazo próximo / encerramento) mesmo com múltiplas execuções da rotina | Aviso repetido é ruído que faz o comprador ignorar futuras notificações | Rodar a rotina duas vezes seguidas sobre o mesmo estado de banco e conferir que só existe um registro de evento por leilão/tipo |
| Nenhum valor de preço, prazo ou nome de loja no aviso é diferente do que está no banco no momento da execução | Aviso com número errado gera decisão comercial equivocada do comprador | Comparar o texto do aviso gerado com a query determinística que o originou, para uma amostra de leilões |
| Rotina não altera `status` nem `lance_vencedor` de nenhum leilão | Adjudicação é decisão manual do comprador; a rotina só observa e avisa | Rodar a rotina sobre leilões vencidos com e sem lance e conferir no banco que `status` e `lance_vencedor` não mudaram |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| % de leilões com lance recebido que são adjudicados antes de vencer | A levantar — sem dado histórico hoje, feature de leilão é recente | +20 p.p. sobre o baseline | 60 dias após o lançamento | +5 p.p. | Dono de produto do marketplace |

## 6. Milestones

### Milestone 1: Comprador nunca perde um leilão por esquecimento

**Por que é um marco:** hoje o comprador só sabe do desfecho do leilão se voltar à página por conta própria; este marco entrega o lembrete e o resumo automáticos, sem exigir hábito de checagem manual.

**Funcionalidades:** US01, US02

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Nenhum aviso duplicado para o mesmo leilão e mesmo tipo de evento
- [ ] Nenhum valor de preço, prazo ou nome de loja no aviso diverge do banco
- [ ] Rotina não altera `status` nem `lance_vencedor` de nenhum leilão

**Aprovador:** Dono de produto do marketplace

### Milestone 2: Lojista sabe o desfecho do próprio lance sem precisar checar

**Por que é um marco:** fecha o loop também do lado de quem deu lance — hoje ele fica sem retorno algum sobre leilões em que participou.

**Funcionalidades:** US03

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] Loja vencedora recebe confirmação ao ser adjudicada
- [ ] Lojas que deram lance e não venceram são avisadas do desfecho (adjudicado para outra loja, ou encerrado sem decisão)

**Aprovador:** Dono de produto do marketplace

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| Ausência de tabela/RPC de evento para leilão (equivalente a `coletiva_evento`) obriga criar schema novo antes de implementar | Médio | Confirmar com o time se o aviso usa uma tabela de notificações já existente no projeto ou se precisa de uma nova, antes de iniciar a implementação | Pendente |
| Rotina não roda com frequência suficiente (depende de como for agendada) e a janela de 24h do lembrete passa sem disparo | Médio | Definir, no TRD/ADR de execução, a frequência mínima de execução da rotina | Pendente |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| RPCs de leilão (`publicar_leilao_fabricante`, `dar_lance_leilao`, `adjudicar_leilao`) em `0040_parceiro_logistico_rpcs.sql` | Interna | Concluída (em produção) | Nenhum — esta feature só lê o que já existe |
| Definição de onde/como os avisos in-app são exibidos ao usuário (mural, central de notificações) | Interna | A confirmar | Sem isso definido, US01–US03 não têm onde aparecer para o usuário final |

## 8. Referências

- [supabase/migrations/0040_parceiro_logistico_rpcs.sql](../../supabase/migrations/0040_parceiro_logistico_rpcs.sql) — RPCs de leilão que esta feature só consome, não altera.
- [src/lib/agentes/coletiva-etapas.ts](../../src/lib/agentes/coletiva-etapas.ts) — padrão de rotina periódica (carregar → avaliar determinístico → redigir → publicar) já validado em produção para compra coletiva, reaproveitado aqui.

## 9. Registro de Decisões

- **2026-08-10:** Adjudicação automática ficou fora do escopo desta feature. Motivo: a RPC `adjudicar_leilao` já foi construída para exigir a sessão do próprio comprador, e o comentário original no código ("a compra em si fecha entre as partes (v1)") indica que essa é uma decisão deliberada do time, não uma lacuna a preencher sem confirmação.
- **2026-08-10:** Feature registrada para implementação em fase futura, a pedido do usuário — status inicial `rascunho`, sem planejamento de execução associado ainda.
