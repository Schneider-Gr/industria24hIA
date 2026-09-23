---
prd_number: "048"
status: rascunho
priority: crítica
created: 2026-09-23
issue: ""
depends_on: ["009"]
references:
  - "docs/prds/009-pos-venda-disputas.md"
  - "docs/prds/047-alerta-imediato-e-venda-futura-vencida.md"
  - "src/lib/asaas-confirmar.ts"
  - "supabase/migrations/0191_guarda_estoque_e_repasse_em_pedido_entregue.sql"
---

# PRD 048: Devolução de dinheiro ao comprador

## 1. Contexto

- **Produto/área**: caminho do dinheiro do Indústria 24h. Fecha o ciclo que o PRD 009 (pós-venda e disputas) abriu.
- **Estado atual**, medido em produção em 23/09/2026:
  - O sistema **decide** devolver, mas **não devolve**. O PRD 009 prevê os desfechos `reembolso_total` e `reembolso_parcial`, a tabela `disputas` existe e tem 3 registros, e nenhuma função no banco move dinheiro: não há nada com "reembolso" ou "estorno" no nome além da abertura de disputa.
  - O que existe é `repasses.status = 'estornado'`, com 4 registros. Isso é **contabilidade interna**: marca que o seller não recebe. Não devolve nada ao comprador.
  - Devolver dinheiro hoje é **operação manual no painel do Asaas**, feita fora do sistema, sem registro no pedido e sem conferência.
  - A migration 0191 fechou o furo oposto (cancelar pedido entregue estornando repasse), mas o lado do comprador segue descoberto.
- **Problema**: o marketplace promete devolução em três lugares — disputas, cancelamento e venda futura não entregue — e cumpre à mão, sem rastro. Três consequências: **o comprador não tem prazo nem previsibilidade**, porque depende de alguém lembrar; **não há conciliação**, porque a devolução não existe no banco e o pedido não sabe que foi devolvido; e **não há como devolver quando o repasse já saiu**, que é justamente o caso mais provável em venda futura atrasada, onde o pagamento aconteceu semanas antes.

## 2. Solução Proposta

### Visão de produto

- A devolução vira **um objeto no sistema**, com valor, motivo, autor e estado, ligada ao pedido — não um clique num painel externo.
- Toda devolução nasce de **uma decisão registrada** (disputa, cancelamento ou atraso), nunca de iniciativa avulsa.
- A execução é **sempre humana na aprovação**, e automática só no envio ao meio de pagamento.
- Quando o dinheiro **já foi repassado ao seller**, o sistema não finge que consegue: registra a devolução como **pendente de acerto com o seller** e mostra isso ao admin, em vez de falhar em silêncio.
- O comprador **acompanha** o estado da devolução e sabe o prazo.

### Decisões de produto

1. **Devolução é registro no sistema, não ação externa.** Sem objeto no banco não há conciliação, prazo, nem resposta ao comprador.
2. **Nenhuma devolução é automática.** Mesmo com a disputa decidida, alguém aprova o envio do dinheiro. É a mesma regra que fez o cancelamento de pedido entregue ser barrado na 0191: dinheiro não se move por gatilho sozinho.
3. **Devolução parcial é de primeira classe**, porque o PRD 009 já prevê `reembolso_parcial` e a maioria dos casos reais é parcial (um item de vários, avaria em parte da carga).
4. **A soma das devoluções de um pedido nunca passa do valor pago.** Trava no sistema, não na atenção do operador.
5. **Repasse já transferido não bloqueia a devolução ao comprador**, mas gera um débito explícito contra o seller. A alternativa — travar a devolução — puniria o comprador por um problema interno.
6. **A comissão da plataforma acompanha a devolução proporcionalmente** *(premissa — confirme ou corrija: a alternativa é o Indústria reter a comissão mesmo em devolução total, o que é difícil de defender)*.
7. **O prazo comunicado ao comprador depende do meio de pagamento** *(premissa — confirme ou corrija: os prazos reais de PIX, boleto e cartão no Asaas precisam ser verificados antes de virar promessa na tela)*.

### Fora do escopo

- **Devolução automática por atraso de venda futura**: a detecção entrou no PRD 047, mas a decisão continua humana. Este PRD dá a ferramenta, não o gatilho.
- **Troca de produto e reenvio**: o PRD 009 os prevê como desfecho, mas não envolvem devolução de dinheiro *(premissa — confirme ou corrija)*.
- **Cobrança judicial ou desconto forçado de seller com saldo negativo**: o débito é registrado e cobrado comercialmente; execução é assunto humano *(premissa — confirme ou corrija)*.
- **Devolução de frete quando a culpa é do transportador**: depende de acerto com a transportadora, que tem regra própria *(premissa — confirme ou corrija)*.
- **Antecipação ou retenção preventiva de repasse** enquanto há disputa aberta: muda o fluxo de repasse inteiro e merece PRD próprio.

## 3. Funcionalidades

### US01: Registrar uma devolução

Como administrador, quero registrar uma devolução ligada a um pedido, com valor e motivo, para que a decisão exista no sistema antes de qualquer dinheiro se mover.

**Rules:**
- Toda devolução tem pedido, valor, motivo, origem da decisão (disputa, cancelamento ou atraso) e autor.
- O valor pode ser total ou parcial.
- A soma das devoluções de um pedido não pode passar do valor efetivamente pago.
- Devolução nasce no estado "pendente de aprovação".
- Motivo é obrigatório.

**Edge cases:**
- Pedido não pago → recusa, porque não há o que devolver.
- Valor maior que o saldo devolvível → recusa informando quanto ainda cabe.
- Segunda devolução no mesmo pedido → permitida, desde que a soma caiba.
- Pedido já totalmente devolvido → recusa.

### US02: Aprovar e enviar a devolução

Como administrador, quero aprovar uma devolução e disparar a devolução do dinheiro, para que o comprador receba sem eu precisar operar o painel do meio de pagamento.

**Rules:**
- Só devolução aprovada é enviada ao meio de pagamento.
- Quem aprova fica registrado, com data.
- O estado acompanha o ciclo: pendente, aprovada, enviada, concluída ou falha.
- Falha no envio não perde o registro: a devolução fica em falha, com o motivo, e pode ser reenviada.
- Uma devolução enviada não pode ser enviada de novo.

**Edge cases:**
- Meio de pagamento recusa (saldo insuficiente na conta, cobrança antiga demais) → estado de falha com o motivo legível, e a devolução aparece para tratamento manual.
- Tentativa de aprovar duas vezes ao mesmo tempo → só uma vale; a outra é recusada sem gerar segunda devolução.
- Sistema de pagamento indisponível → a devolução fica aprovada e aguardando envio, sem perder a aprovação.

### US03: Devolução com repasse já transferido

Como administrador, quero devolver ao comprador mesmo quando o seller já recebeu, para que o comprador não pague pelo nosso descompasso de prazos.

**Rules:**
- Se o repasse do pedido está transferido, a devolução ao comprador segue normalmente.
- O sistema registra um débito do seller no valor devolvido, ligado ao pedido e à devolução.
- O débito aparece para o admin e para o seller, com o motivo.
- Se o repasse ainda não saiu, ele é estornado em vez de gerar débito, como já acontece hoje.

**Edge cases:**
- Repasse parcialmente transferido (seller e afiliado) → cada parte segue sua regra: o que saiu vira débito, o que não saiu é estornado.
- Seller com débito e novo repasse a receber → o débito é apresentado ao admin na hora de liberar o próximo repasse *(premissa — confirme ou corrija: compensar automaticamente é tentador, mas mexe no fluxo de repasse e pode zerar o pagamento de um seller sem aviso)*.
- Devolução cancelada antes do envio → o débito correspondente é desfeito.

### US04: Comprador acompanha a devolução

Como comprador, quero ver que minha devolução foi registrada e em que estado está, para não precisar cobrar o marketplace.

**Rules:**
- O comprador vê, no pedido, o valor devolvido, o estado e a data de cada movimento.
- O comprador é avisado quando a devolução é enviada.
- O comprador não vê o débito do seller nem detalhes internos.

**Edge cases:**
- Devolução em falha → o comprador vê que está em tratamento, sem o erro técnico.
- Devolução parcial → a tela deixa claro o que foi devolvido e o que não foi, com o motivo.

### US05: Conferência das devoluções

Como administrador, quero ver todas as devoluções e seus estados, para conferir contra o extrato do meio de pagamento e não perder nenhuma em falha.

**Rules:**
- Lista com pedido, valor, motivo, origem, estado, autor e datas.
- Filtro por estado, com as falhas em destaque.
- Totais por período, para conciliar com o extrato.

**Edge cases:**
- Devolução enviada e sem confirmação há muito tempo → destacada como pendente de conciliação *(premissa — confirme ou corrija: prazo a definir)*.
- Devolução feita à mão no painel do Asaas, fora do sistema → não aparece aqui; a conciliação por período é o que revela a diferença.

## 4. Fluxo de Negócio

```
Decisão de devolver (disputa, cancelamento ou atraso)
   │
   ▼
Devolução registrada: pedido, valor, motivo, autor  ──▶ soma cabe no valor pago?
   │                                                        └── não ──▶ recusa
   ▼
Aguardando aprovação ──▶ Admin aprova (sempre humano)
   │
   ▼
Repasse do pedido já foi transferido?
   ├── não ──▶ estorna o repasse pendente
   └── sim ──▶ registra débito do seller
   │
   ▼
Envia ao meio de pagamento
   ├── ok ──▶ Enviada ──▶ Concluída (confirmação) ──▶ comprador avisado
   └── falha ──▶ Falha com motivo ──▶ fila de tratamento ──▶ reenvio
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| A soma das devoluções de um pedido nunca passa do valor pago | Devolver mais do que se recebeu é prejuízo direto e irrecuperável | Tentar uma segunda devolução que estoure o saldo |
| Nenhuma devolução sai sem aprovação humana registrada | Dinheiro não se move por gatilho automático; mesma regra da 0191 | Disputa decidida não dispara envio sozinha |
| Aprovar duas vezes em paralelo gera uma devolução só | Dupla devolução do mesmo valor é perda direta | Duas aprovações simultâneas da mesma devolução |
| Falha no envio preserva o registro e o motivo | Falha silenciosa vira comprador sem dinheiro e sem resposta | Simular recusa do meio de pagamento |
| Devolução com repasse já transferido gera débito do seller e não trava | O comprador não pode pagar pelo nosso descompasso de prazos | Pedido com repasse transferido |
| Devolução com repasse pendente estorna o repasse em vez de gerar débito | Cobrar de quem ainda não recebeu seria erro de conta | Pedido com repasse pendente |
| O comprador vê o estado da devolução no pedido | Sem isso ele cobra por WhatsApp, e a promessa não é verificável | Abrir o pedido como comprador |
| Toda devolução registra autor, valor, motivo e datas | É a base da conciliação e da auditoria de dinheiro | Conferir o registro após cada movimento |
| A conferência mostra as devoluções em falha em destaque | Devolução em falha esquecida é o pior caso: dinheiro prometido e não entregue | Abrir a lista com uma falha |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| Devoluções executadas pelo sistema (vs. à mão no Asaas) | 0% (hoje tudo é manual) | 100% | 60 dias | 90% | Dona |
| Tempo entre aprovação e dinheiro enviado | A levantar (hoje depende de alguém lembrar) | mesmo dia útil | 60 dias | 3 dias úteis | Dona |
| Devoluções em falha sem tratamento por mais de 48h | A levantar | 0 | contínuo | 0 | Dona |
| Divergência entre devoluções no sistema e no extrato do Asaas | A levantar | 0 | mensal | 0 | Dona |

## 6. Milestones

### Milestone 1: A devolução existe no sistema

**Por que é um marco:** a devolução deixa de ser um clique num painel externo e passa a ser um fato do pedido, com valor, motivo, autor e estado. É o que torna possível conferir, responder ao comprador e auditar.

**Funcionalidades:** US01, US05

**Checklist de aceite:**
- [ ] A soma das devoluções nunca passa do valor pago
- [ ] Toda devolução registra autor, valor, motivo e datas
- [ ] A conferência lista e destaca as falhas

**Aprovador:** Dona

### Milestone 2: O dinheiro volta pelo sistema

**Por que é um marco:** é quando o marketplace passa a cumprir sozinho o que promete. O admin aprova e o comprador recebe, sem ninguém operar o painel do meio de pagamento.

**Funcionalidades:** US02, US03

**Checklist de aceite:**
- [ ] Nenhuma devolução sai sem aprovação humana registrada
- [ ] Aprovar duas vezes em paralelo gera uma devolução só
- [ ] Falha no envio preserva o registro e o motivo
- [ ] Repasse transferido gera débito do seller e não trava a devolução
- [ ] Repasse pendente é estornado em vez de gerar débito

**Aprovador:** Dona

### Milestone 3: O comprador enxerga

**Por que é um marco:** a devolução deixa de ser promessa por WhatsApp e vira estado visível, com prazo. É o que reduz a cobrança no atendimento.

**Funcionalidades:** US04

**Checklist de aceite:**
- [ ] O comprador vê valor, estado e datas no pedido
- [ ] O comprador é avisado quando a devolução é enviada
- [ ] Devolução parcial deixa claro o que não foi devolvido e por quê

**Aprovador:** Dona

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| Devolução em dobro por retry ou duplo clique | Alto: perda direta e irrecuperável | Estado único por devolução, envio idempotente, trava de concorrência na aprovação | Pendente |
| Seller com débito e sem repasse futuro para compensar | Alto | Débito visível desde o primeiro dia; política de cobrança é decisão comercial | Pendente |
| Prazos de devolução por meio de pagamento não confirmados | Médio | Verificar no Asaas antes de prometer prazo na tela do comprador | Pendente |
| Devoluções feitas à mão em paralelo, fora do sistema | Médio | Conciliação por período contra o extrato; orientar a equipe a usar só o sistema | Monitorando |
| Ambiente do Asaas ainda é sandbox | Alto | Confirmar produção antes de habilitar envio real | Pendente |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| PRD 009, pós-venda e disputas | Interna | Parcial em produção (tabela e 3 disputas) | É a principal origem das decisões de devolução |
| Conta Asaas em produção, com saldo para devoluções | Externa | A confirmar | Bloqueia o Milestone 2 inteiro |
| Decisão da dona sobre comissão na devolução e compensação de débito | Interna | Pendente | Milestones 2 e 3 |

## 8. Referências

- [PRD 009, pós-venda e disputas](009-pos-venda-disputas.md) — define `reembolso_total` e `reembolso_parcial` como desfecho; esta feature executa o que ele decide
- [PRD 047, alerta imediato e venda futura vencida](047-alerta-imediato-e-venda-futura-vencida.md) — detecta o atraso que pode originar devolução, e adiou o estorno para cá
- `supabase/migrations/0191_guarda_estoque_e_repasse_em_pedido_entregue.sql` — a guarda que impede estornar repasse de pedido entregue; o mesmo princípio de não mover dinheiro por gatilho vale aqui
- `repasses` (`status` em `pendente`, `estornado`, `inelegivel`, `transferido`) — a contabilidade interna que hoje é confundida com devolução

## 9. Registro de Decisões

- **2026-09-23:** Devolução vira objeto no sistema, não ação no painel externo. Motivo: sem registro não há conciliação, prazo ao comprador nem auditoria de dinheiro.
- **2026-09-23:** Nenhuma devolução é automática. Motivo: mesma regra que levou a 0191 a barrar cancelamento de pedido entregue; dinheiro não se move por gatilho.
- **2026-09-23:** Repasse já transferido não trava a devolução, gera débito do seller. Motivo: travar puniria o comprador por um descompasso interno de prazos, mais provável justamente na venda futura.
- **2026-09-23:** Devolução parcial é de primeira classe. Motivo: o PRD 009 já a prevê e é o caso mais comum na prática.
- **2026-09-23:** `depends_on` = 009 apenas. Motivo: é de lá que vêm as decisões de devolver. O 047 é referência (detecta o atraso), não pré-requisito: a devolução funciona sem ele.
- **2026-09-23:** Prioridade crítica. Motivo: é o único caminho do dinheiro que o sistema promete e não executa, e a operação manual não deixa rastro nem prazo.
