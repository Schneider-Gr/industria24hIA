---
prd_number: "055"
status: rascunho
priority: crítica
created: 2026-09-25
issue: "#786"
depends_on: ["054", "052", "048"]
references:
  - "src/lib/repasses.ts" – repasse automático atual (seller e afiliado de vendas) por transferência Pix
  - "src/lib/asaas.ts" – createPixTransfer (POST /transfers)
  - "supabase/migrations/0084_admin_repasses_estorno.sql" – tabela repasses, destino só 'seller' ou 'afiliado'
  - "supabase/migrations/0083_comissao_plataforma_corrida.sql" – corridas.valor_parceiro = preco_final menos a comissão
  - "supabase/migrations/0042_rotas_atribuicao_manual.sql" – chave Pix do parceiro e troca protegida (zera a confirmação)
  - "supabase/migrations/0035_chave_pix_protegida.sql" – carência de 24 h da chave do seller (modelo a copiar)
  - "https://docs.asaas.com/docs/split" – FAQ do split: executa no recebimento e não permite data futura (consultado em 25/09/2026)
---

# PRD 055: Pagamento do entregador por transferência Pix no Asaas

## 1. Contexto

- **Produto/área**: caminho do dinheiro da logística. Entregador = quem faz a corrida (PRD 054).
- **Estado atual** (verificado em 25/09/2026):
  - O consumidor paga uma cobrança só no Asaas (produtos + frete), que cai inteira na conta da plataforma. Não há split.
  - Depois da entrega confirmada, o sistema cria repasses e transfere por Pix para a chave do **seller** e do **afiliado de vendas**. O fluxo tem trava contra Pix em dobro e carência de 24 h quando a chave muda.
  - A corrida calcula o `valor_parceiro` (o `preco_final` menos a comissão da plataforma), mas **nenhum código paga o entregador**: a tabela `repasses` só aceita `seller` ou `afiliado`, e a chave Pix do parceiro nunca é usada.
  - O Asaas ainda está em sandbox.
- **Problema**: sem isso, pagar o entregador é manual e fora do sistema. Não escala e não fica registrado. É o bloqueio para operar a entrega por parceiro com motoristas reais.
- **Por que não split**: o split do Asaas é definido na cobrança e executa quando o consumidor paga; a corrida e o entregador só existem depois do pagamento, e o split não aceita data futura (docs.asaas.com, 25/09/2026). O próprio Asaas orienta cobrar sem split e transferir depois.

> **Contexto técnico** no TRD. Este PRD estende o repasse automático que já existe para o seller.

## 2. Solução Proposta

### Visão de produto

- Quando o entregador conclui a entrega, a plataforma transfere o valor da corrida por Pix, pelo Asaas, para a chave cadastrada por ele.
- Mesmo mecanismo e mesmas proteções do repasse ao seller: trava contra pagamento em dobro, carência de 24 h depois de trocar a chave e registro de cada transferência.
- O entregador acompanha no painel o que tem a receber e o que já foi pago.

### Decisões de produto

1. Pagamento por **transferência Pix pelo Asaas** para a chave do entregador (decisão da dona, 25/09).
2. Valor = `valor_parceiro` da corrida = `preco_final` menos a **comissão da plataforma de 5%** (decisão da dona, 25/09; aplicada no banco pela migration 0197). Ex.: frete de R$ 20 → entregador recebe R$ 19.
3. Momento: logo após a **entrega confirmada** de cada corrida, como o seller *(premissa — confirme ou corrija; alternativa: lote semanal)*.
4. A taxa da transferência Pix do Asaas é **absorvida pela plataforma** *(premissa — confirme ou corrija; valor da taxa a conferir na tabela do Asaas)*.
5. Devolução do pedido **depois** da entrega feita: o entregador **mantém** o valor da corrida, porque o serviço foi prestado *(premissa — confirme ou corrija)*.
6. Chave Pix trocada há menos de **24 horas** → o repasse fica aguardando até a chave ficar elegível, como no seller *(premissa — confirme ou corrija)*.
7. Chave Pix obrigatória para aceitar corrida *(premissa — confirme ou corrija)*.
8. **Trocar a chave Pix exige segundo fator por SMS**, para **entregador, seller e afiliado de vendas**: um código enviado ao telefone cadastrado confirma a troca (decisão da dona, 25/09). Provedor de SMS: **a definir**.

### Fora do escopo

- Split do Asaas e subconta por entregador (descartados: o entregador não é conhecido no pagamento).
- Antecipação ou saque manual pelo entregador *(premissa — confirme ou corrija)*.
- Nota fiscal ou recibo do serviço do entregador *(premissa — confirme ou corrija)*.
- Pagamento de corridas antigas, anteriores ao deploy *(premissa — confirme ou corrija)*.

## 3. Funcionalidades

### US01: Chave Pix do entregador

Como entregador, quero cadastrar minha chave Pix, para receber o valor das corridas.

**Rules:**
- Campo chave Pix e tipo (CPF, CNPJ, e-mail, telefone, aleatória) no cadastro do entregador.
- A troca da chave só é concluída depois de o entregador digitar o código enviado por **SMS** ao telefone cadastrado (decisão 8).
- A troca da chave zera a confirmação e inicia 24 h de carência (troca protegida que já existe, 0042).
- Sem chave Pix, o entregador vê as corridas mas não consegue aceitar; a tela explica o motivo.

**Edge cases:**
- Chave em formato inválido para o tipo → não salva.
- Código de SMS errado ou expirado → a chave não muda; após 3 tentativas erradas, bloqueia novas trocas por 1 hora *(premissa — confirme ou corrija)*.
- Telefone cadastrado inacessível → a troca exige atendimento do admin *(premissa — confirme ou corrija)*.
- Troca da chave com repasses aguardando → eles saem para a chave nova depois da carência *(premissa — confirme ou corrija)*.

### US02: Repasse automático após a entrega

Como entregador, quero receber o valor da corrida logo depois de concluir a entrega, para não depender de pagamento manual.

**Rules:**
- Corrida entregue → nasce um repasse para o entregador com o `valor_parceiro`, ligado à corrida.
- Transferência Pix pelo Asaas para a chave do entregador, com a mesma trava do seller: um repasse só vira Pix uma vez.
- Status do repasse: pendente, processando, transferido, falhou, aguardando chave (inelegível), estornado.
- Cada transferência fica registrada (valor, chave usada, data, identificador do Asaas).

**Edge cases:**
- Chave em carência → repasse fica aguardando e sai quando a chave ficar elegível.
- Falha do Asaas → status "falhou", nova tentativa automática e alerta ao admin depois de 3 falhas *(premissa — confirme ou corrija)*.
- Saldo insuficiente na conta Asaas da plataforma → status "falhou" e alerta ao admin.
- Corrida marcada como entregue duas vezes (evento repetido) → um único repasse.

### US03: Painel de ganhos do entregador

Como entregador, quero ver quanto tenho a receber e quanto já recebi, para controlar meus ganhos.

**Rules:**
- Lista por corrida: data, pedido, valor, status do repasse e data da transferência.
- Totais: a receber e recebido no mês.

**Edge cases:**
- Repasse aguardando chave → a linha explica "aguardando carência da chave Pix até [data]".

### US04: Acompanhamento e correção pelo admin

Como admin, quero ver e corrigir os repasses aos entregadores, para resolver falhas sem mexer no banco.

**Rules:**
- Os repasses de entregador aparecem na tela de repasses do admin, com filtro por destino.
- O admin pode reenviar um repasse que falhou e estornar um repasse, com registro de auditoria.

**Edge cases:**
- Reenvio de repasse já transferido → bloqueado.

### US05: Segundo fator por SMS na chave do seller e do afiliado de vendas

Como seller ou afiliado de vendas, quero que a troca da minha chave Pix exija um código enviado por SMS, para que ninguém desvie meus repasses com acesso só à minha senha.

**Rules:**
- Vale para a chave Pix da loja (troca protegida da 0035) e do afiliado de vendas (0129), com a mesma regra da US01.
- A carência de 24 h depois da troca continua valendo.
- O código vai para o telefone cadastrado: WhatsApp da loja para o seller e telefone do perfil para o afiliado *(premissa — confirme ou corrija)*.

**Edge cases:**
- Seller sem WhatsApp cadastrado (14 de 22 lojas em 25/09) → não consegue trocar a chave até cadastrar o telefone *(premissa — confirme ou corrija)*.
- Troca feita pelo admin em nome do seller → exige o código do mesmo jeito, ou registro de atendimento *(premissa — confirme ou corrija)*.

## 4. Fluxo de Negócio

```
Corrida entregue
   │
   ▼
Repasse do entregador (valor_parceiro) ── chave Pix elegível? ──┬── não ──▶ aguardando chave ──▶ (após carência) ─┐
                                                                └── sim ─────────────────────────────────────────────┤
                                                                                                                     ▼
                                                                               Pix pelo Asaas ──┬── ok ──▶ transferido
                                                                                                └── erro ─▶ falhou ──▶ nova tentativa / admin
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| Corrida entregue gera um repasse do `valor_parceiro` e um Pix para a chave do entregador | Pagar sem intervenção manual | Corrida de teste no sandbox do Asaas |
| O mesmo repasse nunca gera dois Pix | Dinheiro não sai em dobro | Disparar a confirmação de entrega duas vezes |
| Chave trocada há menos de 24 h segura o repasse | Proteção contra golpe na troca de chave | Trocar a chave e concluir uma corrida |
| Troca da chave só conclui com o código de SMS | Proteção contra golpe na troca de chave | Tentar trocar com código errado |
| A mesma exigência vale para a chave do seller e do afiliado de vendas | Todo repasse protegido igual | Trocar a chave da loja e a do afiliado |
| Entregador sem chave Pix não aceita corrida | Não gerar dívida sem destino | Aceitar sem chave |
| Falha do Asaas aparece para o admin e pode ser reenviada | Resolver sem mexer no banco | Simular erro no sandbox |
| Painel do entregador mostra a receber e recebido | Transparência | Duas corridas, uma paga e uma aguardando |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| Corridas entregues pagas automaticamente | 0% (nenhum código paga, 25/09) | 95% | 30 dias após sair do sandbox | 90% | Dona |
| Tempo entre entrega e Pix (chave elegível) | A levantar | < 10 min | 30 dias | < 1 h | Dona |
| Repasses com falha resolvidos em até 24 h | A levantar | 100% | 30 dias | 90% | Dona |

## 6. Milestones

### Milestone 1: Entregador recebe pela corrida

**Por que é um marco:** o entregador passa a ser pago pelo sistema, sem pagamento manual.

**Funcionalidades:** US01, US02, US05

**Checklist de aceite:**
- [ ] Corrida entregue gera um repasse do `valor_parceiro` e um Pix para a chave do entregador
- [ ] O mesmo repasse nunca gera dois Pix
- [ ] Chave trocada há menos de 24 h segura o repasse
- [ ] Troca da chave só conclui com o código de SMS
- [ ] A mesma exigência vale para a chave do seller e do afiliado de vendas
- [ ] Entregador sem chave Pix não aceita corrida

**Aprovador:** Dona

### Milestone 2: Ganhos visíveis e falhas resolvidas

**Por que é um marco:** entregador e admin enxergam cada pagamento e o admin corrige falhas pela tela.

**Funcionalidades:** US03, US04

**Checklist de aceite:**
- [ ] Painel do entregador mostra a receber e recebido
- [ ] Falha do Asaas aparece para o admin e pode ser reenviada

**Aprovador:** Dona

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| Pix em dobro | Alto | Mesma trava do repasse do seller (claim pendente → processando) | Mitigado no desenho |
| Troca de chave por golpe | Alto | Carência de 24 h e auditoria | Mitigado no desenho |
| Taxa por transferência pesa em corrida barata | Médio | Plataforma absorve; conferir a tabela do Asaas | Pendente |
| Saldo da conta Asaas insuficiente | Médio | Alerta ao admin; repasse fica "falhou" e é reenviado | Pendente |
| Provedor de SMS não definido | Alto | Milestone 1 não fecha sem ele | Pendente |
| Asaas em sandbox | Alto | Nada move dinheiro real até a virada para produção | Pendente |
| Estorno do pedido depois do Pix ao entregador | Médio | Decisão 5: entregador mantém; custo fica com a plataforma | Pendente |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| PRD 054 (entregador, corrida por produto) | Interna | PR #783 aberto | Define quem aceita e o `valor_parceiro` |
| PRD 052 (frete no repasse) | Interna | pronto | Frete de corrida segue a comissão atual |
| PRD 048 (devolução) | Interna | PR #748 aberto | Regra de estorno quando há devolução |
| Asaas em produção | Externa | sandbox | Milestone 1 só move dinheiro real depois da virada |

## 8. Referências

- `src/lib/repasses.ts`, `src/lib/asaas.ts` e as migrations 0035, 0042, 0083, 0084 (ver frontmatter).
- FAQ do split do Asaas (docs.asaas.com/docs/split), consultado em 25/09/2026.

## 9. Registro de Decisões

- **2026-09-25:** A dona escolheu pagar o entregador por transferência Pix pelo Asaas, depois de ver que o split executa no recebimento (antes de existir o entregador) e não aceita data futura (docs.asaas.com, 25/09).
- **2026-09-25:** `depends_on: ["054", "052", "048"]`. Critério: 054 define o entregador e a corrida; 052 fixa que o frete de corrida segue a comissão atual; 048 define o estorno.
- **2026-09-25:** Comissão da plataforma sobre a corrida = 5% (dona); troca de chave Pix com segundo fator por SMS (dona).
- **2026-09-25:** Segundo fator por SMS vale também para a chave do seller e do afiliado de vendas (US05). Comissão de 5% aplicada no banco (migration 0197, #789).
- **2026-09-25:** Pendentes: provedor de SMS; valor, momento, taxa, devolução pós-entrega, carência e chave obrigatória (premissas 2 a 7).
